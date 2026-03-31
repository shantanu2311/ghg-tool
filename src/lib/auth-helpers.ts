import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Get the authenticated user's ID from the session.
 * Returns userId string or a 401 NextResponse.
 */
export async function getAuthenticatedUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session.user.id;
}

/**
 * Type guard: checks if the result is a userId string (not an error response).
 */
export function isUserId(result: string | NextResponse): result is string {
  return typeof result === 'string';
}
