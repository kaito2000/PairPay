import { SyncQueueAction, SyncQueueItem } from '../types.ts';

const STORAGE_KEY_SYNC_QUEUE = 'pairpay_sync_queue_v1';

export class SyncQueueService {
  /**
   * 現在のキューを取得
   */
  static getQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load sync queue', e);
    }
    return [];
  }

  /**
   * キューを保存
   */
  private static saveQueue(queue: SyncQueueItem[]): void {
    localStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(queue));
  }

  /**
   * アクションをキューに追加
   */
  static enqueue(action: SyncQueueAction, payload: any): SyncQueueItem {
    const queue = this.getQueue();
    const item: SyncQueueItem = {
      id: 'sq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      action,
      payload,
      timestamp: Date.now(),
    };
    queue.push(item);
    this.saveQueue(queue);
    return item;
  }

  /**
   * 保留中のアイテム数を取得
   */
  static getPendingCount(): number {
    return this.getQueue().length;
  }

  /**
   * 指定したアイテムをキューから削除
   */
  static dequeue(id: string): void {
    const queue = this.getQueue().filter((item) => item.id !== id);
    this.saveQueue(queue);
  }

  /**
   * キューを全クリア
   */
  static clear(): void {
    localStorage.removeItem(STORAGE_KEY_SYNC_QUEUE);
  }

  /**
   * キュー内のアイテムを順番に処理し、成功したものを削除
   */
  static async processQueue(
    executor: (item: SyncQueueItem) => Promise<boolean>
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    const remaining: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        const ok = await executor(item);
        if (ok) {
          succeeded++;
        } else {
          failed++;
          remaining.push(item);
        }
      } catch (e) {
        console.warn('[SyncQueue] Processing item failed', item, e);
        failed++;
        remaining.push(item);
      }
    }

    this.saveQueue(remaining);
    return { processed: queue.length, succeeded, failed };
  }
}
