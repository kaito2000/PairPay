import { Expense, CATEGORIES, Household } from '../types.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import { groupExpensesByDate } from '../logic/settlement.ts';

export function renderExpenseList(
  monthlyExpenses: Expense[],
  household: Household,
  showAll: boolean,
  selectedMonthLabel: string
): string {
  const filtered = showAll ? monthlyExpenses : monthlyExpenses.filter((e) => !e.is_settled);
  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);
  const dateGroups = groupExpensesByDate(filtered);

  return `
    <div class="bg-white rounded-[26px] p-4 border border-[#eeebe4] shadow-soft space-y-3.5">
      <!-- リストヘッダー -->
      <div class="flex items-center justify-between pb-1 border-b border-[#f4f1ea]">
        <div class="flex items-center gap-2">
          <span class="text-xs font-black text-[#2d312e]">${selectedMonthLabel}の支出</span>
          <span class="text-[10px] font-bold bg-[#f2efe9] text-[#5c635e] px-2 py-0.5 rounded-full">
            ${filtered.length}件
          </span>
          ${
            filtered.length > 0
              ? `<span class="text-xs font-black text-[#52796f]">¥${totalAmount.toLocaleString()}</span>`
              : ''
          }
        </div>
        <button
          id="btn-toggle-show-all"
          class="text-[11px] font-bold text-[#52796f] hover:text-[#3d5a53] active:underline flex items-center gap-1 cursor-pointer transition-colors"
        >
          <i data-lucide="${showAll ? 'filter' : 'list'}" class="w-3.5 h-3.5"></i>
          <span>${showAll ? '未精算のみ' : 'すべて表示'}</span>
        </button>
      </div>

      <!-- 支出コンテンツ -->
      ${
        filtered.length === 0
          ? `
          <div class="py-12 text-center">
            <div class="w-12 h-12 rounded-2xl bg-[#f7f5f0] flex items-center justify-center mx-auto mb-2.5 text-[#a8a29e] border border-[#ece8e1]">
              <i data-lucide="receipt" class="w-5 h-5"></i>
            </div>
            <p class="text-xs text-[#78716c] font-bold">${selectedMonthLabel}の対象支出はありません</p>
            <p class="text-[11px] text-[#a8a29e] mt-1">下のボタンからカンタンに記録できます</p>
          </div>
        `
          : `
          <div class="space-y-4">
            ${dateGroups
              .map((group) => {
                return `
                <div class="space-y-1.5">
                  <!-- 日付グループヘッダー -->
                  <div class="flex items-center justify-between px-1 text-[11px]">
                    <span class="font-black text-[#5c635e] tracking-tight flex items-center gap-1.5">
                      <i data-lucide="calendar" class="w-3 h-3 text-[#808781]"></i>
                      ${group.displayDate}
                    </span>
                    <span class="font-bold text-[#808781]">
                      小計 ¥${group.totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <!-- その日の支出アイテム一覧 -->
                  <div class="space-y-1.5">
                    ${group.expenses
                      .map((expense) => {
                        const cat = CATEGORIES[expense.category] || CATEGORIES.other;
                        const isUser1 = expense.paid_by_name === household.user1_name;
                        const badgeColor = isUser1
                          ? 'bg-[#edf4f8] text-[#3d637d] border-[#cbe0ec]'
                          : 'bg-[#faedf0] text-[#9c4c5e] border-[#f0cdd5]';

                        const safeTitle = escapeHtml(expense.title || cat.label);
                        const safePaidBy = escapeHtml(expense.paid_by_name);

                        return `
                          <div class="flex items-center justify-between p-2.5 rounded-2xl border border-[#eeebe4] transition-all group ${
                            expense.is_settled ? 'opacity-60 bg-[#f9f8f6]' : 'bg-white hover:border-[#ded9ce]'
                          }">
                            <!-- アイコン & メモ/カテゴリ -->
                            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style="background-color: ${cat.color}15; color: ${cat.color};">
                                <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
                              </div>
                              <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-1.5">
                                  <span class="text-xs font-bold text-[#2d312e] truncate max-w-[140px] sm:max-w-[180px]" title="${safeTitle}">
                                    ${safeTitle}
                                  </span>
                                  ${
                                    expense.is_settled
                                      ? '<span class="text-[9px] font-bold bg-[#eeebe4] text-[#78716c] px-1.5 py-0.2 rounded shrink-0">精算済</span>'
                                      : ''
                                  }
                                </div>
                                <div class="text-[10px] text-[#8f9690] flex items-center gap-1">
                                  <span>${cat.label}</span>
                                  ${expense.title ? `<span>•</span><span class="truncate max-w-[100px]">${safeTitle}</span>` : ''}
                                </div>
                              </div>
                            </div>

                            <!-- 金額 & 立替者バッジ & 編集 & 削除 -->
                            <div class="flex items-center gap-1.5 shrink-0 ml-2">
                              <div class="text-right mr-1">
                                <div class="text-xs font-black text-[#2d312e]">
                                  ¥${expense.amount.toLocaleString()}
                                </div>
                                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-lg border ${badgeColor}">
                                    ${safePaidBy}
                                  </span>
                                  ${
                                    expense.split_type === 'user1_full'
                                      ? `<span class="text-[9px] font-bold px-1 py-0.5 rounded bg-[#e8f0fe] text-[#1967d2] border border-[#d2e3fc] ml-0.5">${escapeHtml(household.user1_name)}全額</span>`
                                      : expense.split_type === 'user2_full'
                                      ? `<span class="text-[9px] font-bold px-1 py-0.5 rounded bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] ml-0.5">${escapeHtml(household.user2_name)}全額</span>`
                                      : expense.split_type === 'equal'
                                      ? `<span class="text-[9px] font-bold px-1 py-0.5 rounded bg-[#e6f4ea] text-[#137333] border border-[#ceead6] ml-0.5">等分</span>`
                                      : ''
                                  }
                                </div>
                              <button
                                data-edit-id="${expense.id}"
                                class="w-7 h-7 rounded-xl flex items-center justify-center text-[#808781] hover:text-[#52796f] hover:bg-[#edf4ee] active:scale-90 transition-all cursor-pointer"
                                title="編集"
                              >
                                <i data-lucide="pencil" class="w-3.5 h-3.5 pointer-events-none"></i>
                              </button>
                              <button
                                data-delete-id="${expense.id}"
                                class="w-7 h-7 rounded-xl flex items-center justify-center text-[#b8beba] hover:text-[#c26d7f] hover:bg-[#faedf0] active:scale-90 transition-all cursor-pointer"
                                title="削除"
                              >
                                <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                              </button>
                            </div>
                          </div>

                        `;
                      })
                      .join('')}
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        `
      }
    </div>
  `;
}
