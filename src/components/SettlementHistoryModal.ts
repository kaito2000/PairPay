import { Expense, Household, SettlementLog } from '../types.ts';
import { escapeHtml } from '../utils/sanitize.ts';

export function renderSettlementHistoryModal(
  logs: SettlementLog[],
  household?: Household,
  expenses?: Expense[]
): string {
  return `
    <div id="settlement-history-modal-overlay" class="fixed inset-0 bg-[#1e2320]/60 backdrop-blur-xs z-40 hidden animate-fade-in transition-opacity">
      <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-5 z-50 animate-slide-up mx-auto max-h-[90vh] flex flex-col border border-[#eeebe4]">
        
        <div class="flex items-center justify-between mb-3 shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-[#edf4ee] flex items-center justify-center text-[#52796f]">
              <i data-lucide="history" class="w-4 h-4"></i>
            </div>
            <div>
              <h2 class="text-base font-extrabold text-[#2d312e]">精算履歴</h2>
              <p class="text-[10px] text-[#808781]">タップすると該当月の精算画面へ移動します</p>
            </div>
          </div>
          <button type="button" id="btn-close-settlement-history" class="w-8 h-8 rounded-full flex items-center justify-center text-[#999f9a] hover:text-[#2d312e] hover:bg-[#f5f2eb] transition-all cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
          ${
            logs.length === 0
              ? `
            <div class="p-8 text-center bg-[#fbfaf8] rounded-2xl border border-[#eeebe4] space-y-2">
              <div class="w-10 h-10 mx-auto rounded-full bg-[#f4f1ea] flex items-center justify-center text-[#999f9a]">
                <i data-lucide="inbox" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-bold text-[#4a504b]">まだ精算履歴がありません</p>
              <p class="text-[11px] text-[#808781] leading-relaxed">
                ダッシュボードで「精算完了にする」を押すと、ここに完了記録が保存されます。
              </p>
            </div>
          `
              : `
            <div class="space-y-2.5">
              ${logs
                .map((log) => {
                  const safeSender = escapeHtml(log.sender_name);
                  const safeReceiver = escapeHtml(log.receiver_name);

                  const user1Name = log.user1_name || household?.user1_name || '夫';
                  const user2Name = log.user2_name || household?.user2_name || '妻';
                  const safeUser1Name = escapeHtml(user1Name);
                  const safeUser2Name = escapeHtml(user2Name);

                  // ログに記録された立替額、または過去ログ向けに支出データから補完
                  let user1Amt = typeof log.user1_amount === 'number' ? log.user1_amount : -1;
                  let user2Amt = typeof log.user2_amount === 'number' ? log.user2_amount : -1;

                  if ((user1Amt < 0 || user2Amt < 0) && expenses && expenses.length > 0) {
                    const monthlyExps = expenses.filter((e) => e.expense_date.startsWith(log.year_month));
                    user1Amt = monthlyExps
                      .filter((e) => e.paid_by_name === user1Name)
                      .reduce((sum, e) => sum + e.amount, 0);
                    user2Amt = monthlyExps
                      .filter((e) => e.paid_by_name === user2Name)
                      .reduce((sum, e) => sum + e.amount, 0);
                  }
                  if (user1Amt < 0) user1Amt = 0;
                  if (user2Amt < 0) user2Amt = 0;

                  const dateStr = log.settled_at
                    ? new Date(log.settled_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return `
                    <div
                      class="settlement-history-item bg-[#fbfaf8] hover:bg-[#f4f1ea] active:scale-[0.99] p-3.5 rounded-2xl border border-[#eeebe4] hover:border-[#ded9ce] space-y-2 transition-all cursor-pointer group shadow-2xs"
                      data-jump-ym="${escapeHtml(log.year_month)}"
                      title="${escapeHtml(log.year_month)} の精算画面へ移動"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-black bg-[#edf4ee] text-[#426b42] px-2 py-0.5 rounded-full border border-[#c8decb]">
                            ${escapeHtml(log.year_month)} 分
                          </span>
                          <span class="text-[10px] text-[#52796f] font-bold flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <span>表示</span>
                            <i data-lucide="chevron-right" class="w-3 h-3"></i>
                          </span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-[10px] text-[#808781]">${dateStr}</span>
                          <button
                            type="button"
                            data-delete-log-id="${log.id}"
                            class="btn-delete-log w-6 h-6 rounded-lg text-[#b8beba] hover:text-[#c26d7f] hover:bg-[#faedf0] flex items-center justify-center transition-all cursor-pointer"
                            title="履歴を削除"
                          >
                            <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
                          </button>
                        </div>
                      </div>

                      <!-- 送金額サマリー -->
                      <div class="flex items-center justify-between pt-0.5">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-[#4a504b]">
                          <span>${safeSender}</span>
                          <i data-lucide="arrow-right" class="w-3 h-3 text-[#808781]"></i>
                          <span>${safeReceiver}</span>
                        </div>
                        <div class="text-sm font-black text-[#2d312e]">
                          ${log.amount === 0 ? '差額なし（¥0）' : `¥${log.amount.toLocaleString()}`}
                        </div>
                      </div>

                      <!-- 各自の立替実績 -->
                      <div class="grid grid-cols-2 gap-1.5 bg-[#f4f1ea]/80 p-2 rounded-xl text-[10px]">
                        <div class="flex items-center justify-between px-1">
                          <span class="text-[#3d637d] font-bold truncate">${safeUser1Name}立替</span>
                          <span class="font-extrabold text-[#2d312e]">¥${user1Amt.toLocaleString()}</span>
                        </div>
                        <div class="flex items-center justify-between px-1 border-l border-[#ded9ce]">
                          <span class="text-[#9c4c5e] font-bold truncate">${safeUser2Name}立替</span>
                          <span class="font-extrabold text-[#2d312e]">¥${user2Amt.toLocaleString()}</span>
                        </div>
                      </div>

                      <!-- フッター -->
                      <div class="text-[10px] text-[#808781] flex items-center justify-between pt-1 border-t border-[#eeebe4]/80">
                        <span>対象支出: ${log.expense_count}件</span>
                        <span>総支出: ¥${log.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `
          }
        </div>
      </div>
    </div>
  `;
}
