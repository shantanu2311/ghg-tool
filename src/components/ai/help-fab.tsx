'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelpStore } from '@/lib/help-store';

export function HelpFab() {
  const { isOpen, open } = useHelpStore();

  if (isOpen) return null;

  return (
    <Button
      size="icon"
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-30"
      onClick={() => open()}
    >
      <Sparkles className="h-5 w-5" />
    </Button>
  );
}
