import { Expense } from '../types.ts';

const STORAGE_KEY_TAGS_MAP = 'pairpay_expense_tags_map_v1';
const memoryFallbackMap: Record<string, string[]> = {};

/**
 * ローカルのタグマップを取得 { [expenseId]: string[] }
 */
export function getLocalTagsMap(): Record<string, string[]> {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY_TAGS_MAP);
      if (data) return JSON.parse(data);
    } else {
      return { ...memoryFallbackMap };
    }
  } catch (e) {
    console.warn('Failed to load local tags map', e);
  }
  return {};
}

/**
 * ローカルのタグマップに保存
 */
export function saveLocalTags(expenseId: string, tags: string[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const map = getLocalTagsMap();
      if (tags && tags.length > 0) {
        map[expenseId] = tags;
      } else {
        delete map[expenseId];
      }
      localStorage.setItem(STORAGE_KEY_TAGS_MAP, JSON.stringify(map));
    } else {
      if (tags && tags.length > 0) {
        memoryFallbackMap[expenseId] = tags;
      } else {
        delete memoryFallbackMap[expenseId];
      }
    }
  } catch (e) {
    console.warn('Failed to save local tags map', e);
  }
}

/**
 * 支出オブジェクトの title と tags を透過的にデコード・補完する
 * 1. DB に tags カラムがある場合 ➔ そのまま使用
 * 2. DB に tags カラムがない場合 ➔ title の [tag:...] メタデータから復元
 * 3. title にもない場合 ➔ LocalStorage のタグマップキャッシュから復元
 */
export function hydrateExpenseTags(expense: Expense): Expense {
  const localMap = getLocalTagsMap();
  const cachedTags = localMap[expense.id];

  // 1. すでに expense.tags が配列として存在する場合
  if (Array.isArray(expense.tags) && expense.tags.length > 0) {
    // title に [tag:...] が残っていれば除去してクリーンにする
    const cleanTitle = (expense.title || '').replace(/\s*\[tag:[^\]]+\]\s*$/, '').trim();
    saveLocalTags(expense.id, expense.tags);
    return { ...expense, title: cleanTitle };
  }

  // 2. title から [tag:...] を抽出
  const rawTitle = expense.title || '';
  const match = rawTitle.match(/\[tag:([^\]]+)\]/);
  if (match) {
    const extractedTags = match[1]
      .split(',')
      .map((t) => t.trim().replace(/^#+/, ''))
      .filter(Boolean);
    const cleanTitle = rawTitle.replace(/\s*\[tag:[^\]]+\]\s*$/, '').trim();
    saveLocalTags(expense.id, extractedTags);
    return { ...expense, title: cleanTitle, tags: extractedTags };
  }

  // 3. ローカルキャッシュに tags があればマージ
  if (cachedTags && cachedTags.length > 0) {
    return { ...expense, tags: cachedTags };
  }

  return { ...expense, tags: expense.tags || [] };
}

/**
 * 支出リスト全体をデコード・補完
 */
export function hydrateExpensesTags(expenses: Expense[]): Expense[] {
  return expenses.map(hydrateExpenseTags);
}

/**
 * DB に tags カラムがない場合でも Supabase 経由で共有できるよう title にメタデータを付与
 */
export function encodeTitleWithTags(title: string, tags?: string[]): string {
  const cleanTitle = (title || '').replace(/\s*\[tag:[^\]]+\]\s*$/, '').trim();
  if (!tags || tags.length === 0) return cleanTitle;
  return `${cleanTitle} [tag:${tags.join(',')}]`;
}
