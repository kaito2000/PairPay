import { MonthOption } from '../types.ts';

export function renderMonthNavigator(
  selectedYearMonth: string,
  currentYearMonth: string,
  availableMonths: MonthOption[]
): string {
  const isCurrentMonth = selectedYearMonth === currentYearMonth;

  return `
    <div class="bg-white rounded-[22px] p-2 px-3 border border-[#ece8e1] shadow-soft flex items-center justify-between gap-2">
      <!-- 前月ボタン -->
      <button
        id="btn-prev-month"
        class="w-9 h-9 rounded-xl flex items-center justify-center text-[#5c635e] hover:text-[#2d312e] hover:bg-[#f5f2eb] active:scale-95 transition-all cursor-pointer shrink-0"
        aria-label="前月へ"
        title="前月へ"
      >
        <i data-lucide="chevron-left" class="w-5 h-5 pointer-events-none"></i>
      </button>

      <!-- 年月セレクター中央部分 -->
      <div class="flex items-center gap-2 relative">
        <div class="relative flex items-center">
          <select
            id="select-month-dropdown"
            class="appearance-none bg-[#f7f5f0] hover:bg-[#eeebe4] text-[#2d312e] font-extrabold text-sm py-1.5 pl-3.5 pr-8 rounded-xl border border-[#ded9ce] cursor-pointer transition-all outline-none focus:border-[#52796f] focus:ring-1 focus:ring-[#52796f]/20"
            title="年月を選択"
          >
            ${availableMonths
              .map(
                (opt) => `
              <option value="${opt.yearMonth}" ${opt.yearMonth === selectedYearMonth ? 'selected' : ''}>
                ${opt.label} ${opt.count > 0 ? `(${opt.count}件)` : ''}
              </option>
            `
              )
              .join('')}
          </select>
          <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#808781]">
            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
          </div>
        </div>

        ${
          !isCurrentMonth
            ? `
          <button
            id="btn-current-month"
            class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#edf4ee] text-[#426b42] border border-[#c8decb] hover:bg-[#deece0] active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
            title="今月に戻る"
          >
            <i data-lucide="calendar" class="w-3 h-3 pointer-events-none"></i>
            <span>今月</span>
          </button>
        `
            : ''
        }
      </div>

      <!-- 翌月ボタン -->
      <button
        id="btn-next-month"
        class="w-9 h-9 rounded-xl flex items-center justify-center text-[#5c635e] hover:text-[#2d312e] hover:bg-[#f5f2eb] active:scale-95 transition-all cursor-pointer shrink-0"
        aria-label="翌月へ"
        title="翌月へ"
      >
        <i data-lucide="chevron-right" class="w-5 h-5 pointer-events-none"></i>
      </button>
    </div>
  `;
}
