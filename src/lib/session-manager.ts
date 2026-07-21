import { CardRecord } from './types';

export const BATCH_BREAK_THRESHOLD = 50;
export const MAX_SESSION_LIMIT = 100;

export interface SessionState {
  cards: CardRecord[];
  processedCount: number;
  batchCount: number;
  isWaterBreakActive: boolean;
  waterBreakTimeRemaining: number;
  isSessionLimitReached: boolean;
}

export function createInitialSessionState(): SessionState {
  return {
    cards: [],
    processedCount: 0,
    batchCount: 0,
    isWaterBreakActive: false,
    waterBreakTimeRemaining: 60,
    isSessionLimitReached: false,
  };
}

export function appendCardsToSession(
  currentState: SessionState,
  newCards: CardRecord[]
): { nextState: SessionState; addedCount: number; triggerWaterBreak: boolean; limitReached: boolean } {
  const currentTotal = currentState.cards.length;
  const remainingSpace = MAX_SESSION_LIMIT - currentTotal;

  if (remainingSpace <= 0) {
    return {
      nextState: { ...currentState, isSessionLimitReached: true },
      addedCount: 0,
      triggerWaterBreak: false,
      limitReached: true,
    };
  }

  const cardsToAdd = newCards.slice(0, remainingSpace);
  const updatedCards = [...currentState.cards, ...cardsToAdd];
  const newBatchCount = currentState.batchCount + cardsToAdd.length;
  
  const triggerWaterBreak = newBatchCount >= BATCH_BREAK_THRESHOLD && updatedCards.length < MAX_SESSION_LIMIT;
  const limitReached = updatedCards.length >= MAX_SESSION_LIMIT;

  const nextState: SessionState = {
    ...currentState,
    cards: updatedCards,
    processedCount: updatedCards.length,
    batchCount: triggerWaterBreak ? 0 : newBatchCount,
    isWaterBreakActive: triggerWaterBreak,
    waterBreakTimeRemaining: triggerWaterBreak ? 60 : 0,
    isSessionLimitReached: limitReached,
  };

  return {
    nextState,
    addedCount: cardsToAdd.length,
    triggerWaterBreak,
    limitReached,
  };
}
