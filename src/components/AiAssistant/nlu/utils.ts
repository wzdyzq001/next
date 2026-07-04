import type { GuidedQuestion } from '../types';

export function createQuickReply(id: string, question: string): GuidedQuestion {
  return {
    id,
    question,
    score: 1,
    priority: 1,
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
