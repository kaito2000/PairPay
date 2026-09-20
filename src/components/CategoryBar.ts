import { Expense, CATEGORIES, CategoryType } from '../types.ts';

export function renderCategoryBar(monthlyExpenses: Expense[], selectedMonthLabel: string): string {
  const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (total === 0) {
    return `
      <div class="bg-white rounded-[24px] p-4 border border-[#eeebe4] shadow-soft">
        <div class="text-xs font-bold text-[#3a3f3b] mb-1.5 flex items-center justify-between">
          <span>${selectedMonthLabel}のカテゴリ別内訳</span>
        </div>
        <div class="text-xs text-[#8f9690] py-3 text-center font-medium">この月の支出データはありません</div>
      </div>
    `;
  }

  // カテゴリごとの合計を計算
  const catTotals: Partial<Record<CategoryType, number>> = {};
  for (const e of monthlyExpenses) {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  }

  // 割合を算出
  const items = (Object.keys(catTotals) as CategoryType[])
    .map((catKey) => {
      const amount = catTotals[catKey] || 0;
      const percent = Math.round((amount / total) * 100);
      return {
        category: CATEGORIES[catKey],
        amount,
        percent,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return `
    <div class="bg-white rounded-[24px] p-4 border border-[#eeebe4] shadow-soft">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold text-[#3a3f3b]">${selectedMonthLabel}のカテゴリ内訳</span>
        <span class="text-[11px] font-semibold text-[#808781]">計 ¥${total.toLocaleString()}</span>
      </div>

      <!-- プログレスバー -->
      <div class="h-2.5 w-full rounded-full bg-[#f2efe9] overflow-hidden flex mb-3.5">
        ${items
          .map(
            (item) => `
          <div style="width: ${item.percent}%; background-color: ${item.category.color};" class="h-full transition-all duration-300" title="${item.category.label}: ${item.percent}% (¥${item.amount.toLocaleString()})"></div>
        `
          )
          .join('')}
      </div>

      <!-- 凡例チップス -->
      <div class="flex flex-wrap gap-2">
        ${items
          .map(
            (item) => `
          <div class="flex items-center gap-1.5 text-[11px] bg-[#f9f8f6] border border-[#ece8e1] px-2.5 py-1 rounded-lg">
            <span class="w-2 h-2 rounded-full" style="background-color: ${item.category.color};"></span>
            <span class="font-medium text-[#464c47]">${item.category.label}</span>
            <span class="text-[#7c827d] font-bold">${item.percent}% (¥${item.amount.toLocaleString()})</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}
