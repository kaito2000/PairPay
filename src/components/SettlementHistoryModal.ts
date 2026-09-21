import { SettlementLog } from '../types.ts';
import { escapeHtml } from '../utils/sanitize.ts';

export function renderSettlementHistoryModal(logs: SettlementLog[]): string {
  return `
    <div id="settlement-history-modal-overlay" class="fixed inset-0 bg-[#1e2320]/60 backdrop-blur-xs z-40 hidden animate-fade-in transition-opacity">
      <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-5 z-50 animate-slide-up mx-auto max-h-[90vh] overflow-y-auto no-scrollbar border border-[#eeebe4]">
        
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-[#edf4ee] flex items-center justify-center text-[#52796f]">
              <i data-lucide="history" class="w-4 h-4"></i>
            </div>
            <div>
              <h2 class="text-base font-extrabold text-[#2d312e]">精算履歴</h2>
              <p class="text-[10px] text-[#808781]">過去の立替精算の完了記録</p>
            </div>
          </div>
          <button type="button" id="btn-close-settlement-history" class="w-8 h-8 rounded-full flex items-center justify-center text-[#999f9a] hover:text-[#2d312e] hover:bg-[#f5f2eb] transition-all cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="space-y-3">
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
                    <div class="bg-[#fbfaf8] p-3.5 rounded-2xl border border-[#eeebe4] space-y-2 transition-all">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-[#2d312e] bg-[#edf4ee] text-[#426b42] px-2 py-0.5 rounded-full border border-[#c8decb]">
                          ${escapeHtml(log.year_month)} 分
                        </span>
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
