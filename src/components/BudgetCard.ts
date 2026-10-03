export function renderBudgetCard(
  budget: number | undefined,
  monthlyTotal: number,
  previousMonthTotal: number,
  monthLabel: string
): string {
  const hasBudget = typeof budget === 'number' && budget > 0;

  // 前月との差額計算
  const hasPreviousMonth = previousMonthTotal > 0;
  const diffFromPrev = monthlyTotal - previousMonthTotal;

  let prevComparisonText = '';
  let prevComparisonBadge = '';

  if (hasPreviousMonth) {
    if (diffFromPrev < 0) {
      const saved = Math.abs(diffFromPrev);
      prevComparisonText = `前月 (¥${previousMonthTotal.toLocaleString()}) より ¥${saved.toLocaleString()} 節約中`;
      prevComparisonBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#426b42] bg-[#edf4ee] px-2 py-0.5 rounded-full border border-[#c8decb]">
        🌱 ${prevComparisonText}
      </span>`;
    } else if (diffFromPrev > 0) {
      prevComparisonText = `前月 (¥${previousMonthTotal.toLocaleString()}) より +¥${diffFromPrev.toLocaleString()}`;
      prevComparisonBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#9c631e] bg-[#faf3e8] px-2 py-0.5 rounded-full border border-[#edd8ba]">
        📈 ${prevComparisonText}
      </span>`;
    } else {
      prevComparisonBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#5c635e] bg-[#f2f4f2] px-2 py-0.5 rounded-full border border-[#d4d9d4]">
        前月と同額 (¥${previousMonthTotal.toLocaleString()})
      </span>`;
    }
  }

  // 1. 目標予算が設定されている場合
  if (hasBudget) {
    const safeBudget = budget;
    const percent = Math.min(Math.round((monthlyTotal / safeBudget) * 100), 999);
    const remaining = safeBudget - monthlyTotal;
    const isOver = remaining < 0;

    // カラー判定
    let barColor = 'bg-[#52796f]'; // 通常: くすみグリーン
    let statusBadge = '';

    if (isOver) {
      barColor = 'bg-[#c26d7f]'; // 超過: ローズレッド
      statusBadge = `
        <span class="text-[11px] font-extrabold text-[#c26d7f] bg-[#faedf0] px-2 py-0.5 rounded-full border border-[#f0cdd5] flex items-center gap-1">
          <span>¥${Math.abs(remaining).toLocaleString()} 超過</span>
        </span>
      `;
    } else if (percent >= 80) {
      barColor = 'bg-[#cb8634]'; // 80%超: オレンジ注意
      statusBadge = `
        <span class="text-[11px] font-bold text-[#cb8634] bg-[#faf3e8] px-2 py-0.5 rounded-full border border-[#edd8ba]">
          残り ¥${remaining.toLocaleString()}
        </span>
      `;
    } else {
      statusBadge = `
        <span class="text-[11px] font-bold text-[#426b42] bg-[#edf4ee] px-2 py-0.5 rounded-full border border-[#c8decb]">
          残り ¥${remaining.toLocaleString()}
        </span>
      `;
    }

    const clampedBarPercent = Math.min(percent, 100);

    return `
      <!-- 月間予算 & 前月比較カード -->
      <section class="bg-white rounded-[22px] p-3.5 shadow-card border border-[#ece8e1] space-y-2.5 transition-all">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-[#edf4ee] text-[#52796f] flex items-center justify-center border border-[#c8decb]">
              <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
            </div>
            <div>
              <span class="text-xs font-black text-[#2d312e]">${monthLabel}の生活費予算</span>
              <span class="text-[10px] text-[#808781] ml-1">目標: ¥${safeBudget.toLocaleString()}</span>
            </div>
          </div>
          ${statusBadge}
        </div>

        <!-- プログレスバー -->
        <div class="space-y-1">
          <div class="w-full bg-[#f0ece5] rounded-full h-2.5 overflow-hidden flex">
            <div
              class="${barColor} h-full rounded-full transition-all duration-500 ease-out"
              style="width: ${clampedBarPercent}%;"
            ></div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-[#808781] font-medium pt-0.5">
            <span>使用額: <strong class="text-[#2d312e] font-bold">¥${monthlyTotal.toLocaleString()}</strong> (${percent}%)</span>
            <button
              type="button"
              id="btn-open-budget-setting"
              class="text-[10px] text-[#52796f] hover:underline font-bold cursor-pointer"
            >
              予算変更
            </button>
          </div>
        </div>

        <!-- 前月比較バッジ -->
        ${
          prevComparisonBadge
            ? `
          <div class="pt-1 border-t border-[#f4f1ea] flex items-center justify-between">
            ${prevComparisonBadge}
          </div>
        `
            : ''
        }
      </section>
    `;
  }

  // 2. 目標予算が未設定の場合 (前月比較＋予算設定リンク)
  return `
    <!-- 前月比較 & 予算設定カード (未設定時) -->
    <section class="bg-[#fbfaf8] rounded-2xl p-3 border border-[#ece8e1] flex items-center justify-between gap-2 shadow-2xs">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-6 h-6 rounded-lg bg-white text-[#52796f] flex items-center justify-center border border-[#ded9ce] shrink-0 shadow-2xs">
          <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
        </div>
        <div class="min-w-0">
          <div class="text-[11px] font-bold text-[#4a504b] truncate">
            ${prevComparisonBadge ? prevComparisonBadge : `生活費合計: <span class="font-extrabold text-[#2d312e]">¥${monthlyTotal.toLocaleString()}</span>`}
          </div>
        </div>
      </div>
      <button
        type="button"
        id="btn-open-budget-setting"
        class="shrink-0 px-2.5 py-1 rounded-xl bg-white border border-[#ded9ce] hover:bg-[#edf4ee] active:scale-95 text-[10px] font-extrabold text-[#52796f] transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
      >
        <i data-lucide="plus-circle" class="w-3 h-3"></i>
        <span>目標予算を設定</span>
      </button>
    </section>
  `;
}
