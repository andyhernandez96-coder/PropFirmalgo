import { useEffect, useState } from 'react';
import { askClaudePrompt } from '../../../shared/prompts';
import type { PresentedQuestion } from '../../../shared/shuffle';
import { copyText } from '../clipboard';
import { Button } from './ui';

export function CopyButton({
  text,
  label,
  copiedLabel = 'Copied!',
  variant = 'secondary',
  size = 'md',
}: {
  text: () => string;
  label: string;
  copiedLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <Button
      variant={variant}
      size={size}
      onClick={async () => setState((await copyText(text())) ? 'copied' : 'failed')}
      aria-live="polite"
    >
      {state === 'copied' ? `✓ ${copiedLabel}` : state === 'failed' ? 'Could not copy' : label}
    </Button>
  );
}

/** Copies the question, options, your answer and the correct one, ready to paste into Claude. */
export function AskClaudeButton({
  presented,
  selected,
  answered,
  size = 'md',
}: {
  presented: PresentedQuestion;
  selected: number[];
  answered: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <CopyButton
      size={size}
      label="Ask Claude"
      copiedLabel="Copied — paste it in Claude"
      text={() =>
        askClaudePrompt({
          question: presented.question.question,
          options: presented.options,
          correct: presented.correct,
          selected,
          answered,
        })
      }
    />
  );
}
