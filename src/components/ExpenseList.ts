import { Expense, CATEGORIES, Household } from '../types.ts';
import { escapeHtml } from '../utils/sanitize.ts';

export function renderExpenseList(
  expenses: Expense[],
  household: Household,
  showAll: boolean
): string {
  const filtered = showAll ? expenses : expenses.filter((e) => !e.is_settled);

  return `
    <div class="bg-white rounded-[24px] p-4 border border-[#eeebe4] shadow-soft">
      <div class="flex items-center justify-between mb-3.5">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-[#3a3f3b]">支出履歴</span>
          <span class="text-[10px] font-bold bg-[#f2efe9] text-[#5c635e] px-2 py-0.5 rounded-full">
            ${filtered.length}件
          </span>
        </div>
        <button id="btn-toggle-show-all" class="text-xs font-bold text-[#52796f] hover:text-[#3d5a53] active:underline flex items-center gap-1 cursor-pointer">
          ${showAll ? '未精算のみ表示' : 'すべて表示'}
        </button>
      </div>

      ${
        filtered.length === 0
          ? `
          <div class="py-10 text-center">
            <div class="w-12 h-12 rounded-2xl bg-[#f7f5f0] flex items-center justify-center mx-auto mb-2 text-[#a8a29e]">
              <i data-lucide="receipt" class="w-5 h-5"></i>
            </div>
            <p class="text-xs text-[#78716c] font-medium">表示できる支出がありません</p>
            <p class="text-[11px] text-[#a8a29e] mt-1">下のボタンから記録してみましょう</p>
          </div>
        `
          : `
          <div class="space-y-2">
            ${filtered
              .map((expense) => {
                const cat = CATEGORIES[expense.category] || CATEGORIES.other;
                const isUser1 = expense.paid_by_name === household.user1_name;
                const badgeColor = isUser1
                  ? 'bg-[#edf4f8] text-[#3d637d] border-[#cbe0ec]'
                  : 'bg-[#faedf0] text-[#9c4c5e] border-[#f0cdd5]';

                const dateParts = expense.expense_date.split('-');
                const displayDate = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : expense.expense_date;
                const safeTitle = escapeHtml(expense.title || cat.label);
                const safePaidBy = escapeHtml(expense.paid_by_name);

                return `
                  <div class="flex items-center justify-between p-2.5 rounded-2xl border border-[#eeebe4] transition-all group ${
                    expense.is_settled ? 'opacity-60 bg-[#f9f8f6]' : 'bg-white hover:border-[#ded9ce]'
                  }">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <!-- アイコン -->
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style="background-color: ${cat.color}20; color: ${cat.color};">
                        <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
                      </div>
                      
                      <!-- 日付・品目・カテゴリ -->
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                          <span class="text-[11px] font-bold text-[#8f9690] shrink-0">${displayDate}</span>
                          <span class="text-xs font-bold text-[#2d312e] truncate block max-w-[150px] sm:max-w-[200px]" title="${safeTitle}">${safeTitle}</span>
                          ${
                            expense.is_settled
                              ? '<span class="text-[9px] font-bold bg-[#eeebe4] text-[#78716c] px-1.5 py-0.2 rounded shrink-0">精算済</span>'
                              : ''
                          }
                        </div>
                        <div class="text-[10px] text-[#8f9690] flex items-center gap-1">
                          <span>${cat.label}</span>
                          ${expense.title ? `<span>•</span><span class="truncate block max-w-[120px]">${safeTitle}</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- 金額・立替者バッジ・削除 -->
                    <div class="flex items-center gap-2 shrink-0 ml-2">
                      <div class="text-right">
                        <div class="text-xs font-black text-[#2d312e]">
                          ¥${expense.amount.toLocaleString()}
                        </div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badgeColor}">
                          ${safePaidBy}
                        </span>
                      </div>
                      <button data-delete-id="${expense.id}" class="w-7 h-7 rounded-xl flex items-center justify-center text-[#b8beba] hover:text-[#c26d7f] hover:bg-[#faedf0] active:scale-90 transition-all cursor-pointer" title="削除">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                      </button>
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
