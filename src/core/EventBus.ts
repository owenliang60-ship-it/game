import type { BattleEventType, BattleEventDataMap, BattleEvent } from './types';

type Handler<T extends BattleEventType> = (event: BattleEvent<T>) => void;

/**
 * Typed event emitter for battle events.
 * The sole communication bridge between pure logic and rendering layers.
 */
export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on<T extends BattleEventType>(type: T, handler: Handler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  off<T extends BattleEventType>(type: T, handler: Handler<T>): void {
    this.listeners.get(type)?.delete(handler);
  }

  emit<T extends BattleEventType>(type: T, round: number, data: BattleEventDataMap[T]): void {
    const event: BattleEvent<T> = { type, round, data };
    const handlers = this.listeners.get(type);
    if (handlers) {
      for (const handler of handlers) {
        (handler as Handler<T>)(event);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
