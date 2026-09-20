import { Household, SupabaseConfig } from '../types.ts';
import { escapeHtml } from '../utils/sanitize.ts';

export function renderSettingsModal(
  household: Household,
  supabaseConfig: SupabaseConfig | null,
  isCloudSync: boolean
): string {
  const safeUser1 = escapeHtml(household.user1_name);
  const safeUser2 = escapeHtml(household.user2_name);
  const safeUrl = escapeHtml(supabaseConfig?.url || '');
  const safeAnonKey = escapeHtml(supabaseConfig?.anonKey || '');
  const safeJoinCode = escapeHtml(household.join_code || '');

  return `
    <div id="settings-modal-overlay" class="fixed inset-0 bg-[#1e2320]/60 backdrop-blur-xs z-40 hidden animate-fade-in transition-opacity">
      <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-5 z-50 animate-slide-up mx-auto max-h-[90vh] overflow-y-auto no-scrollbar border border-[#eeebe4]">
        
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-[#edf4ee] flex items-center justify-center text-[#52796f]">
              <i data-lucide="settings" class="w-4 h-4"></i>
            </div>
            <h2 class="text-base font-extrabold text-[#2d312e]">設定</h2>
          </div>
          <button type="button" id="btn-close-settings" class="w-8 h-8 rounded-full flex items-center justify-center text-[#999f9a] hover:text-[#2d312e] hover:bg-[#f5f2eb] transition-all cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="space-y-4">
          <!-- 1. 世帯設定（名前 & 負担割合） -->
          <form id="form-settings" class="space-y-3.5 bg-[#fbfaf8] p-3.5 rounded-2xl border border-[#eeebe4]">
            <div class="space-y-2">
              <label class="block text-xs font-bold text-[#4a504b]">メンバーの呼び名</label>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="text-[10px] text-[#808781] block mb-1">メンバー1</span>
                  <input
                    type="text"
                    id="settings-user1-name"
                    value="${safeUser1}"
                    required
                    class="w-full px-3 py-2 bg-white border border-[#ded9ce] rounded-xl text-xs font-bold text-[#2d312e] focus:border-[#52796f] outline-none"
                  />
                </div>
                <div>
                  <span class="text-[10px] text-[#808781] block mb-1">メンバー2</span>
                  <input
                    type="text"
                    id="settings-user2-name"
                    value="${safeUser2}"
                    required
                    class="w-full px-3 py-2 bg-white border border-[#ded9ce] rounded-xl text-xs font-bold text-[#2d312e] focus:border-[#52796f] outline-none"
                  />
                </div>
              </div>
            </div>

            <!-- 負担割合設定 -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-[#4a504b]">負担割合 (%)</label>
                <span id="settings-ratio-display" class="text-xs font-black text-[#52796f]">
                  ${safeUser1} ${household.ratio_user1}% : ${safeUser2} ${household.ratio_user2}%
                </span>
              </div>
              <input
                type="range"
                id="settings-ratio-slider"
                min="0"
                max="100"
                step="5"
                value="${household.ratio_user1}"
                class="w-full h-2 bg-[#e2ded6] rounded-lg appearance-none cursor-pointer accent-[#52796f]"
              />
              <div class="flex justify-between text-[10px] text-[#808781] font-semibold">
                <span>${safeUser1} 0%</span>
                <span>折半 (50:50)</span>
                <span>${safeUser1} 100%</span>
              </div>
            </div>


            <button
              type="submit"
              class="w-full py-2.5 px-4 rounded-xl bg-[#2d312e] hover:bg-[#3d423e] active:scale-[0.98] text-white font-bold text-xs shadow-soft transition-all cursor-pointer"
            >
              世帯設定を保存
            </button>
          </form>

          <!-- 2. 世帯共有 (招待コード & 参加) -->
          ${
            isCloudSync
              ? `
            <div class="space-y-3 bg-[#edf4ee] p-3.5 rounded-2xl border border-[#c8decb]">
              <div class="flex items-center gap-1.5 text-xs font-black text-[#2e5235]">
                <i data-lucide="users" class="w-4 h-4 text-[#52796f]"></i>
                <span>パートナーと共有する</span>
              </div>

              ${
                household.join_code
                  ? `
                <div>
                  <span class="text-[11px] text-[#426b42] block mb-1 font-medium">現在の世帯招待コード</span>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 px-3 py-2 bg-white rounded-xl border border-[#c8decb] text-center font-mono font-black text-sm tracking-widest text-[#2e5235]">
                      ${safeJoinCode}
                    </div>
                    <button
                      type="button"
                      id="btn-copy-join-code"
                      data-code="${safeJoinCode}"
                      class="px-3 py-2 bg-[#52796f] hover:bg-[#486b62] active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-soft transition-all cursor-pointer"
                    >
                      <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                      <span>コピー</span>
                    </button>
                  </div>
                  <p class="text-[10px] text-[#426b42]/80 mt-1 font-medium">パートナーの端末でこのコードを入力するとリアルタイムに同期されます。</p>
                </div>
              `
                  : ''
              }

              <!-- 別の世帯コードで参加 -->
              <div class="pt-2 border-t border-[#c8decb]">
                <span class="text-[11px] text-[#426b42] block mb-1 font-medium">別の世帯に参加する</span>
                <div class="flex gap-2">
                  <input
                    type="text"
                    id="input-join-code"
                    placeholder="招待コード (例: A1B2C3)"
                    maxlength="8"
                    class="flex-1 px-3 py-2 bg-white border border-[#c8decb] rounded-xl text-xs font-mono tracking-wider uppercase text-[#2d312e] outline-none focus:border-[#52796f]"
                  />
                  <button
                    type="button"
                    id="btn-join-household"
                    class="px-3 py-2 bg-[#2d312e] hover:bg-[#3d423e] active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    参加
                  </button>
                </div>
              </div>
            </div>
          `
              : `
            <div class="bg-[#f7f5f0] p-3.5 rounded-2xl border border-[#ece8e1] space-y-1">
              <div class="text-xs font-bold text-[#4a504b] flex items-center gap-1.5">
                <i data-lucide="cloud-off" class="w-3.5 h-3.5 text-[#808781]"></i>
                <span>クラウド同期: 未接続</span>
              </div>
              <p class="text-[11px] text-[#78716c] leading-relaxed">
                現在はローカル（この端末のみ）で動作中です。下のSupabase設定を入力すると、2台のスマホ間でリアルタイム同期が可能になります。
              </p>
            </div>
          `
          }

          <!-- 3. Supabase クラウド接続設定 -->
          <div class="space-y-3 bg-[#fbfaf8] p-3.5 rounded-2xl border border-[#eeebe4]">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-[#4a504b] flex items-center gap-1.5">
                <i data-lucide="database" class="w-3.5 h-3.5 text-[#52796f]"></i>
                <span>Supabase 連携設定</span>
              </label>
              ${
                isCloudSync
                  ? '<span class="text-[10px] font-bold text-[#426b42] bg-[#edf4ee] px-2 py-0.5 rounded-full border border-[#c8decb]">接続中</span>'
                  : '<span class="text-[10px] font-semibold text-[#808781] bg-[#f0ece5] px-2 py-0.5 rounded-full">未設定</span>'
              }
            </div>

            <form id="form-supabase-config" class="space-y-2">
              <div>
                <span class="text-[10px] text-[#808781] block mb-1">Project URL</span>
                <input
                  type="url"
                  id="supabase-url"
                  placeholder="https://xxxx.supabase.co"
                  value="${safeUrl}"
                  required
                  class="w-full px-3 py-2 bg-white border border-[#ded9ce] rounded-xl text-xs font-mono text-[#2d312e] outline-none focus:border-[#52796f]"
                />
              </div>
              <div>
                <span class="text-[10px] text-[#808781] block mb-1">Anon Key</span>
                <input
                  type="password"
                  id="supabase-anon-key"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                  value="${safeAnonKey}"
                  required
                  class="w-full px-3 py-2 bg-white border border-[#ded9ce] rounded-xl text-xs font-mono text-[#2d312e] outline-none focus:border-[#52796f]"
                />
              </div>


              <div class="flex gap-2 pt-1">
                <button
                  type="submit"
                  class="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#52796f] to-[#3d5a53] hover:from-[#486b62] hover:to-[#354f49] active:scale-98 text-white font-bold text-xs transition-all shadow-soft cursor-pointer"
                >
                  ${isCloudSync ? '再接続 / 保存' : '接続して同期を開始'}
                </button>
                ${
                  supabaseConfig
                    ? `
                  <button
                    type="button"
                    id="btn-disconnect-supabase"
                    class="py-2.5 px-3 rounded-xl border border-[#ded9ce] hover:bg-[#f0ece5] active:scale-95 text-[#6d746f] text-xs font-bold transition-all cursor-pointer"
                  >
                    解除
                  </button>
                `
                    : ''
                }
              </div>
            </form>
          </div>

          <!-- 4. データ管理 -->
          <div class="pt-1">
            <button
              type="button"
              id="btn-reset-data"
              class="w-full py-2.5 px-3 rounded-xl border border-[#f0cdd5] text-[#c26d7f] hover:bg-[#faedf0] active:scale-[0.98] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>ローカルデータを初期化</span>
            </button>
          </div>

          <div class="pt-1 text-center">
            <p class="text-[10px] text-[#a8a29e]">PairPay • Soft Cafe Edition</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
