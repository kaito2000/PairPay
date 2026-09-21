import { SettlementSummary, Household } from '../types.ts';
import { escapeHtml } from '../utils/sanitize.ts';

export function renderSettlementCard(
  summary: SettlementSummary,
  household: Household,
  selectedMonthLabel: string,
  unsettledCount: number,
  monthlyTotalAmount: number
): string {
  const isZero = summary.transferAmount === 0;
  const safeUser1 = escapeHtml(household.user1_name);
  const safeUser2 = escapeHtml(household.user2_name);
  const safeSender = escapeHtml(summary.senderName || '');
  const safeReceiver = escapeHtml(summary.receiverName || '');

  // この月の全支出が精算済みかどうかの判定
  const isAllSettled = unsettledCount === 0 && monthlyTotalAmount > 0;
  const isEmptyMonth = monthlyTotalAmount === 0;

  return `
    <div class="bg-gradient-to-br from-[#2f3e37] via-[#28362f] to-[#202b26] text-white rounded-[28px] p-5 shadow-card relative overflow-hidden">
      <!-- 柔らかなオーガニックブラー背景 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-[#52796f]/25 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-[#84a98c]/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- ヘッダー -->
      <div class="flex items-center justify-between mb-4 relative z-10">
        <span class="text-[11px] font-bold tracking-wider text-[#a3b899] uppercase flex items-center gap-1.5">
          <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
          <span>${selectedMonthLabel}の精算</span>
        </span>
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] text-[#e8f0e6] font-semibold bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15">
            負担比率 ${household.ratio_user1}:${household.ratio_user2}
          </span>
          <button
            type="button"
            id="btn-open-settlement-history"
            class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-[#e8f0e6] transition-all cursor-pointer border border-white/15 shadow-xs"
            title="精算履歴を見る"
          >
            <i data-lucide="history" class="w-3.5 h-3.5 pointer-events-none"></i>
          </button>
        </div>
      </div>

      <!-- 立替内訳 -->
      <div class="grid grid-cols-2 gap-2.5 mb-4 bg-white/[0.07] backdrop-blur-md rounded-2xl p-3 border border-white/10 relative z-10">
        <div class="border-r border-white/10 pr-2">
          <div class="text-[11px] text-[#c0d4c8] mb-0.5 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-[#82a7c9]"></span>
            <span class="font-medium">${safeUser1}の立替</span>
          </div>
          <div class="text-xl font-extrabold tracking-tight text-white">
            ¥${summary.user1Total.toLocaleString()}
          </div>
        </div>
        <div class="pl-2">
          <div class="text-[11px] text-[#c0d4c8] mb-0.5 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-[#e396a5]"></span>
            <span class="font-medium">${safeUser2}の立替</span>
          </div>
          <div class="text-xl font-extrabold tracking-tight text-white">
            ¥${summary.user2Total.toLocaleString()}
          </div>
        </div>
      </div>

      <!-- 送金アクションバナー -->
      <div class="mb-4 p-3.5 rounded-2xl ${
        isEmptyMonth || isAllSettled || isZero
          ? 'bg-[#52796f]/20 border border-[#84a98c]/30 text-[#e8f0e6]'
          : 'bg-gradient-to-r from-[#52796f]/35 via-[#6b9080]/30 to-[#52796f]/35 border border-[#84a98c]/40 text-white shadow-inner'
      } relative z-10">
        <div class="text-[11px] text-[#b7d5be] font-medium mb-1 flex items-center justify-between">
          <span>精算ステータス</span>
          ${
            unsettledCount > 0
              ? `<span class="text-[10px] bg-[#c26d7f]/80 text-white px-2 py-0.2 rounded-full">未精算 ${unsettledCount}件</span>`
              : ''
          }
        </div>
        <div class="text-base font-black flex items-center justify-between">
          <span class="flex items-center gap-2">
            ${
              isEmptyMonth
                ? '<i data-lucide="info" class="w-4 h-4 text-[#a3b899] inline"></i> 支出データなし'
                : isAllSettled
                ? '<i data-lucide="check-circle" class="w-4 h-4 text-[#a3b899] inline"></i> この月は精算完了済み'
                : isZero
                ? '<i data-lucide="check-circle" class="w-4 h-4 text-[#a3b899] inline"></i> 差額なし・精算不要'
                : `<span class="text-white/80 text-sm font-semibold">${safeSender}</span> <i data-lucide="arrow-right" class="w-4 h-4 text-[#a3b899] inline"></i> <span class="text-white/80 text-sm font-semibold">${safeReceiver}</span>`
            }
          </span>
          ${
            !isEmptyMonth && !isAllSettled && !isZero
              ? `<span class="text-2xl text-[#d8f3dc] tracking-tight font-black">¥${summary.transferAmount.toLocaleString()}</span>`
              : ''
          }
        </div>
        <div class="mt-1 text-[11px] text-[#c0d4c8] flex items-center justify-between">
          <span>未精算の支出: <span class="text-white font-bold">¥${summary.totalAmount.toLocaleString()}</span></span>
          <span>月の総支出: <span class="text-white font-bold">¥${monthlyTotalAmount.toLocaleString()}</span></span>
        </div>
      </div>

      <!-- アクションボタン -->
      <div class="grid grid-cols-2 gap-2 relative z-10">
        <button
          id="btn-copy-line"
          class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-xs font-bold text-white border border-white/15 transition-all shadow-xs cursor-pointer"
        >
          <i data-lucide="share-2" class="w-3.5 h-3.5 text-[#b7d5be]"></i>
          <span>LINE文面コピー</span>
        </button>
        <button
          id="btn-settle-all"
          ${unsettledCount === 0 ? 'disabled' : ''}
          class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl ${
            unsettledCount === 0
              ? 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#52796f] to-[#406259] hover:from-[#5e8a7f] hover:to-[#4a6f65] active:scale-[0.98] text-white shadow-md shadow-[#202b26]/30 cursor-pointer'
          } text-xs font-bold transition-all"
        >
          <i data-lucide="check" class="w-3.5 h-3.5"></i>
          <span>${unsettledCount === 0 ? '精算済み' : '精算完了にする'}</span>
        </button>
      </div>
    </div>
  `;
}
