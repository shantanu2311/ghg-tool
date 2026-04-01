import { create } from 'zustand';

export interface HelpMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface HelpState {
  isOpen: boolean;
  messages: HelpMessage[];
  isLoading: boolean;
  error: string | null;
  suggestedQuestions: string[];
  context: {
    currentStep: string;
    currentField?: string;
    currentScope?: number;
    currentCategory?: string;
    currentFuelType?: string;
    organisationSector?: string;
    organisationSubSector?: string;
    organisationState?: string;
  };
}

interface HelpActions {
  open: (ctx?: Partial<HelpState['context']>) => void;
  close: () => void;
  setContext: (ctx: Partial<HelpState['context']>) => void;
  setSuggestedQuestions: (questions: string[]) => void;
  ask: (question: string) => Promise<void>;
  clearMessages: () => void;
}

export const useHelpStore = create<HelpState & HelpActions>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,
  suggestedQuestions: [],
  context: { currentStep: 'organisation' },

  open: (ctx) => {
    set((s) => ({
      isOpen: true,
      context: ctx ? { ...s.context, ...ctx } : s.context,
    }));
  },

  close: () => set({ isOpen: false }),

  setContext: (ctx) => {
    set((s) => ({ context: { ...s.context, ...ctx } }));
  },

  setSuggestedQuestions: (questions) => set({ suggestedQuestions: questions }),

  ask: async (question: string) => {
    const { context, messages } = get();

    // Add user message
    const userMsg: HelpMessage = { role: 'user', content: question, timestamp: Date.now() };
    set({ messages: [...messages, userMsg], isLoading: true, error: null });

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, context }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: HelpMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isLoading: false,
        suggestedQuestions: data.suggestedQuestions || [],
      }));
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  },

  clearMessages: () => set({ messages: [], error: null, suggestedQuestions: [] }),
}));
