import type { GuidedQuestion } from '../types';

export function createQuickReply(
  id: string,
  question: string,
  action?: GuidedQuestion['action']
): GuidedQuestion {
  return {
    id,
    question,
    score: 1,
    priority: 1,
    ...(action ? { action } : {}),
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
