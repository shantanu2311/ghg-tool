import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';
import { buildSystemPrompt, type AssistantContext } from '@/lib/ai/system-prompt';
import { getSuggestedQuestions } from '@/lib/ai/suggested-questions';

// ---------------------------------------------------------------------------
// In-memory rate limiter: 30 questions per user per hour
// ---------------------------------------------------------------------------

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateBucket {
  count: number;
  windowStart: number;
}

const rateLimits = new Map<string, RateBucket>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const bucket = rateLimits.get(userId);

  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateLimits.set(userId, { count: 1, windowStart: now });
    return false;
  }

  if (bucket.count >= RATE_LIMIT) {
    return true;
  }

  bucket.count++;
  return false;
}

// Periodically clean up stale entries (every 10 minutes)
if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 10 * 60 * 1000;
  let lastCleanup = Date.now();

  // We run cleanup lazily on each request rather than setInterval
  // to avoid issues with serverless cold starts
  (globalThis as Record<string, unknown>).__aiAssistantCleanup = () => {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, bucket] of rateLimits.entries()) {
      if (now - bucket.windowStart > RATE_WINDOW_MS) {
        rateLimits.delete(key);
      }
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/ai-assistant
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    // Rate limit
    if (isRateLimited(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can ask up to 30 questions per hour. Please try again later.' },
        { status: 429 }
      );
    }

    // Lazy cleanup
    const cleanup = (globalThis as Record<string, unknown>).__aiAssistantCleanup;
    if (typeof cleanup === 'function') cleanup();

    // Parse request body
    const body = await request.json();
    const { message, context } = body as {
      message?: string;
      context?: AssistantContext;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Please keep it under 1000 characters.' },
        { status: 400 }
      );
    }

    // Build context — use defaults if not provided
    const assistantContext: AssistantContext = {
      currentStep: context?.currentStep || 'organisation',
      currentField: context?.currentField,
      currentScope: context?.currentScope,
      currentCategory: context?.currentCategory,
      currentFuelType: context?.currentFuelType,
      organisationSector: context?.organisationSector,
      organisationSubSector: context?.organisationSubSector,
      organisationState: context?.organisationState,
      language: context?.language,
      analysisSummary: context?.analysisSummary,
    };

    const systemPrompt = buildSystemPrompt(assistantContext);

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI assistant is not configured. Please contact the administrator.' },
        { status: 503 }
      );
    }

    // Call OpenAI Chat Completions API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message.trim() },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text().catch(() => '');
      console.error(`OpenAI API error: ${openaiResponse.status} ${errorBody}`);

      if (openaiResponse.status === 429) {
        return NextResponse.json(
          { error: 'AI service is temporarily busy. Please try again in a moment.' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'AI service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const data = await openaiResponse.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || '';

    if (!reply) {
      return NextResponse.json(
        { error: 'AI returned an empty response. Please try rephrasing your question.' },
        { status: 502 }
      );
    }

    // Generate suggested follow-up questions based on the current step
    const suggestedQuestions = getSuggestedQuestions(assistantContext.currentStep, 3);

    return NextResponse.json({
      reply,
      suggestedQuestions,
    });
  } catch (error) {
    console.error('AI assistant error:', error);

    // Handle fetch/network errors specifically
    if (error instanceof TypeError && (error as Error).message?.includes('fetch')) {
      return NextResponse.json(
        { error: 'Could not reach AI service. Please check your internet connection.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
