import { CATEGORIES, CategoryType, Household, RecurringTemplate } from '../types.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import { getSplitTypeLabel } from '../utils/csv.ts';

export function renderRecurringModal(
  templates: RecurringTemplate[],
  household: Household,
  selectedYearMonth: string
): string {
  const safeUser1 = escapeHtml(household.user1_name);
  const safeUser2 = escapeHtml(household.user2_name);
  const totalMonthlyRecurring = templates.reduce((sum, t) => sum + t.amount, 0);

  return `
    <div id="recurring-modal-overlay" class="fixed inset-0 bg-[#1e2320]/60 backdrop-blur-xs z-40 hidden animate-fade-in transition-opacity">
      <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-5 z-50 animate-slide-up mx-auto max-h-[90vh] overflow-y-auto no-scrollbar border border-[#eeebe4]">
        
        <!-- ヘッダー -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-[#edf4ee] flex items-center justify-center text-[#52796f]">
              <i data-lucide="repeat" class="w-4 h-4"></i>
            </div>
            <div>
              <h2 class="text-base font-extrabold text-[#2d312e]">固定費・定期支出</h2>
              <p class="text-[10px] text-[#808781]">毎月の家賃・光熱費・サブスクの一括反映</p>
            </div>
          </div>
          <button type="button" id="btn-close-recurring" class="w-8 h-8 rounded-full flex items-center justify-center text-[#999f9a] hover:text-[#2d312e] hover:bg-[#f5f2eb] transition-all cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="space-y-4">
          <!-- 1. 一括反映バナー -->
          <div class="bg-gradient-to-br from-[#edf4ee] to-[#e2ece4] p-3.5 rounded-2xl border border-[#c8decb] space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#426b42] flex items-center gap-1.5">
                <i data-lucide="calendar-check" class="w-3.5 h-3.5"></i>
                <span>${escapeHtml(selectedYearMonth)} に一括反映</span>
              </span>
              <span class="text-[11px] font-bold text-[#426b42]">
                合計 ¥${totalMonthlyRecurring.toLocaleString()}
              </span>
            </div>
            <p class="text-[10px] text-[#557855] leading-relaxed">
              登録済みの固定費を、選択中の月の支出として一括で追加します（既に登録済みの同じ名称の支出は重複防止されます）。
            </p>
            <button
              type="button"
              id="btn-apply-recurring-to-month"
              ${templates.length === 0 ? 'disabled' : ''}
              class="w-full py-2.5 px-3 rounded-xl ${
                templates.length === 0
                  ? 'bg-[#d8e4d9] text-[#8f9690] cursor-not-allowed'
                  : 'bg-[#52796f] hover:bg-[#486b62] active:scale-98 text-white shadow-soft cursor-pointer'
              } text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
              <span>${selectedYearMonth} の支出に一括反映する</span>
            </button>
          </div>

          <!-- 2. 登録済み固定費一覧 -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-[#4a504b] px-1">
              <span>登録済みの固定費 (${templates.length}件)</span>
            </div>

            ${
              templates.length === 0
                ? `
              <div class="p-4 text-center bg-[#fbfaf8] rounded-2xl border border-[#eeebe4] text-xs text-[#808781]">
                固定費テンプレートがありません。下のフォームから追加してください。
              </div>
            `
                : `
              <div class="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
                ${templates
                  .map((t) => {
                    const cat = CATEGORIES[t.category] || CATEGORIES.utility;
                    const safeTitle = escapeHtml(t.title);
                    const safePayer = escapeHtml(t.paid_by_name);
                    const splitLabel = getSplitTypeLabel(t.split_type, household);

                    return `
                      <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[#fbfaf8] border border-[#eeebe4] hover:border-[#ded9ce] transition-all">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <div class="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style="background-color: ${cat.color}15; color: ${cat.color};">
                            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold text-[#2d312e] truncate">${safeTitle}</div>
                            <div class="text-[10px] text-[#808781] flex items-center gap-1 truncate">
                              <span>${safePayer}立替</span>
                              <span>•</span>
                              <span>${splitLabel}</span>
                            </div>
                          </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0 ml-2">
                          <span class="text-xs font-black text-[#2d312e]">
                            ¥${t.amount.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            data-delete-recurring-id="${t.id}"
                            class="btn-delete-recurring w-6 h-6 rounded-lg text-[#b8beba] hover:text-[#c26d7f] hover:bg-[#faedf0] flex items-center justify-center transition-all cursor-pointer"
                            title="削除"
                          >
                            <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
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

          <!-- 3. 新規固定費追加フォーム -->
          <form id="form-add-recurring" class="bg-[#fbfaf8] p-3.5 rounded-2xl border border-[#eeebe4] space-y-2.5">
            <div class="text-xs font-bold text-[#4a504b] flex items-center gap-1.5">
              <i data-lucide="plus" class="w-3.5 h-3.5 text-[#52796f]"></i>
              <span>新しい固定費を追加</span>
            </div>

            <div class="grid grid-cols-5 gap-2">
              <div class="col-span-3">
                <span class="text-[10px] text-[#808781] block mb-0.5">名称</span>
                <input
                  type="text"
                  id="recurring-title"
                  placeholder="例: 家賃、光熱費"
                  required
                  class="w-full px-3 py-1.5 bg-white border border-[#ded9ce] rounded-xl text-xs font-bold text-[#2d312e] outline-none focus:border-[#52796f]"
                />
              </div>
              <div class="col-span-2">
                <span class="text-[10px] text-[#808781] block mb-0.5">金額 (円)</span>
                <input
                  type="number"
                  id="recurring-amount"
                  placeholder="50000"
                  min="1"
                  required
                  class="w-full px-3 py-1.5 bg-white border border-[#ded9ce] rounded-xl text-xs font-bold text-[#2d312e] outline-none focus:border-[#52796f]"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div>
                <span class="text-[10px] text-[#808781] block mb-0.5">カテゴリ</span>
                <select id="recurring-category" class="w-full px-2 py-1.5 bg-white border border-[#ded9ce] rounded-xl text-xs text-[#2d312e] outline-none focus:border-[#52796f]">
                  ${(Object.keys(CATEGORIES) as CategoryType[])
                    .map((catKey) => {
                      const cat = CATEGORIES[catKey];
                      return `<option value="${cat.id}">${cat.label}</option>`;
                    })
                    .join('')}
                </select>
              </div>
              <div>
                <span class="text-[10px] text-[#808781] block mb-0.5">立替者</span>
                <select id="recurring-payer" class="w-full px-2 py-1.5 bg-white border border-[#ded9ce] rounded-xl text-xs text-[#2d312e] outline-none focus:border-[#52796f]">
                  <option value="${safeUser1}">${safeUser1}</option>
                  <option value="${safeUser2}">${safeUser2}</option>
                </select>
              </div>
              <div>
                <span class="text-[10px] text-[#808781] block mb-0.5">負担方法</span>
                <select id="recurring-split" class="w-full px-2 py-1.5 bg-white border border-[#ded9ce] rounded-xl text-xs text-[#2d312e] outline-none focus:border-[#52796f]">
                  <option value="ratio">基本比率</option>
                  <option value="equal">等分</option>
                  <option value="user1_full">${safeUser1}全額</option>
                  <option value="user2_full">${safeUser2}全額</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              class="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#f0ece5] active:scale-98 text-[#52796f] border border-[#c8decb] font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 mt-1"
            >
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>この固定費を登録する</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}
