import { CategoryType, Expense, Household, QuickPreset, SplitType, CATEGORIES } from '../types.ts';

/**
 * 過去の支出データから「よく使うプリセット」を自動抽出・生成する
 * @param expenses 支出リスト
 * @param household 世帯情報
 * @param maxItems 最大件数 (デフォルト4件)
 */
export function getQuickPresets(
  expenses: Expense[],
  household: Household,
  maxItems: number = 4
): QuickPreset[] {
  // 1. デフォルト候補（支出が少ない時や初回用のフォールバック）
  const defaultPresets: QuickPreset[] = [
    {
      id: 'default-supermarket',
      title: 'スーパー',
      category: 'food',
      paid_by_name: household.user1_name,
      split_type: 'ratio',
      icon: 'utensils',
      count: 0,
    },
    {
      id: 'default-drugstore',
      title: 'ドラッグストア',
      category: 'daily',
      paid_by_name: household.user2_name,
      split_type: 'ratio',
      icon: 'shopping-bag',
      count: 0,
    },
    {
      id: 'default-cafe',
      title: 'カフェ・外食',
      category: 'dining',
      paid_by_name: household.user1_name,
      split_type: 'equal',
      icon: 'coffee',
      count: 0,
    },
    {
      id: 'default-convenience',
      title: 'コンビニ',
      category: 'other',
      paid_by_name: household.user2_name,
      split_type: 'ratio',
      icon: 'more-horizontal',
      count: 0,
    },
  ];

  if (!expenses || expenses.length === 0) {
    return defaultPresets.slice(0, maxItems);
  }

  // 2. 過去の支出からタイトルがあるものを集計
  interface AggregatedItem {
    title: string;
    category: CategoryType;
    paid_by_name: string;
    split_type: SplitType;
    count: number;
    lastAmount: number;
    lastDate: string;
  }

  const map = new Map<string, AggregatedItem>();

  for (const exp of expenses) {
    const trimmedTitle = (exp.title || '').trim();
    if (!trimmedTitle) continue;

    // 世帯メンバーの変更に対応（旧メンバー名の場合はデフォルトに寄せる）
    const paidBy =
      exp.paid_by_name === household.user1_name || exp.paid_by_name === household.user2_name
        ? exp.paid_by_name
        : household.user1_name;

    const splitType = exp.split_type || 'ratio';
    const key = `${trimmedTitle}:::${exp.category}:::${paidBy}:::${splitType}`;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (exp.expense_date >= existing.lastDate) {
        existing.lastDate = exp.expense_date;
        existing.lastAmount = exp.amount;
      }
    } else {
      map.set(key, {
        title: trimmedTitle,
        category: exp.category,
        paid_by_name: paidBy,
        split_type: splitType,
        count: 1,
        lastAmount: exp.amount,
        lastDate: exp.expense_date,
      });
    }
  }

  // 出現頻度順（同率なら直近の日付順）にソート
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastDate.localeCompare(a.lastDate);
  });

  const results: QuickPreset[] = sorted.slice(0, maxItems).map((item, idx) => ({
    id: `preset-${idx}-${encodeURIComponent(item.title)}`,
    title: item.title,
    category: item.category,
    paid_by_name: item.paid_by_name,
    split_type: item.split_type,
    default_amount: item.lastAmount,
    icon: CATEGORIES[item.category]?.icon || 'receipt',
    count: item.count,
  }));

  // もし抽出結果が maxItems より少なければデフォルトで補完
  if (results.length < maxItems) {
    for (const def of defaultPresets) {
      if (results.length >= maxItems) break;
      // 重複チェック
      const isDuplicate = results.some(
        (r) => r.title === def.title && r.category === def.category
      );
      if (!isDuplicate) {
        results.push(def);
      }
    }
  }

  return results.slice(0, maxItems);
}
