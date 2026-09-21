import { CATEGORIES, CategoryType, Household } from '../types.ts';

export function renderExpenseModal(household: Household): string {
  const todayStr = new Date().toISOString().split('T')[0];

  return `
    <!-- 開くための固定フローティングトリガー (画面下部) -->
    <div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#fbfaf8] via-[#fbfaf8]/95 to-[#fbfaf8]/0 z-30 max-w-md mx-auto pointer-events-none pb-6">
      <button id="btn-open-modal" class="pointer-events-auto w-full py-4 px-5 rounded-[22px] bg-gradient-to-r from-[#52796f] to-[#3d5a53] hover:from-[#486b62] hover:to-[#354f49] active:scale-[0.98] text-white font-extrabold text-sm shadow-floating flex items-center justify-center gap-2.5 transition-all cursor-pointer">
        <i data-lucide="plus-circle" class="w-5 h-5"></i>
        <span>支出を記録する</span>
      </button>
    </div>

    <!-- モーダル背景オーバーレイ -->
    <div id="expense-modal-overlay" class="fixed inset-0 bg-[#1e2320]/60 backdrop-blur-xs z-40 hidden animate-fade-in transition-opacity">
      <!-- ボトムシートコンテナ (flexレイアウトで保存ボタンを常に画面下部に固定) -->
      <div id="expense-modal-sheet" class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#ffffff] rounded-t-[32px] shadow-2xl p-5 pb-4 z-50 animate-slide-up max-h-[92vh] flex flex-col overflow-hidden border-t border-[#eeebe4]">
        
        <!-- ヘッダー (タイトル & 保存ボタン & クローズボタン) -->
        <div class="flex items-center justify-between mb-3 shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-[#52796f]"></div>
            <h3 id="modal-expense-title" class="text-sm font-extrabold text-[#2d312e]">支出を記録する</h3>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-header-save-expense"
              class="px-3 py-1.5 rounded-xl bg-[#edf4ee] hover:bg-[#dfece1] active:scale-95 text-[#426b42] font-black text-xs transition-all border border-[#c8decb] flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <i data-lucide="check" class="w-3.5 h-3.5 pointer-events-none"></i>
              <span>保存</span>
            </button>
            <button type="button" id="btn-close-modal" class="w-8 h-8 rounded-full flex items-center justify-center text-[#999f9a] hover:text-[#2d312e] hover:bg-[#f5f2eb] transition-all cursor-pointer">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <form id="form-expense" class="flex-1 flex flex-col min-h-0">
          <input type="hidden" id="input-expense-id" value="" />

          <!-- スクロール可能入力エリア -->
          <div class="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-0.5 pb-2">

          <!-- 1. 金額ディスプレイ & クイック加算 -->
          <div class="bg-[#fbfaf8] rounded-2xl p-4 border border-[#eeebe4] text-center shadow-inner relative">
            <div class="text-[11px] font-bold text-[#808781] mb-1">金額</div>
            <div class="flex items-center justify-center gap-1">
              <span class="text-2xl font-bold text-[#808781]">¥</span>
              <span id="display-amount" class="text-3xl sm:text-4xl font-black text-[#2d312e] tracking-tight font-mono">0</span>
            </div>
            <input type="hidden" id="input-amount" value="0" />

            <!-- クイック加算チップス -->
            <div class="flex justify-center gap-2 mt-3 pt-2.5 border-t border-[#ece8e1]">
              <button type="button" data-add="1000" class="quick-add-btn px-3 py-1 rounded-xl bg-white border border-[#ded9ce] text-[11px] font-bold text-[#52796f] hover:bg-[#edf4ee] active:scale-95 shadow-soft transition-all cursor-pointer">
                +1,000
              </button>
              <button type="button" data-add="5000" class="quick-add-btn px-3 py-1 rounded-xl bg-white border border-[#ded9ce] text-[11px] font-bold text-[#52796f] hover:bg-[#edf4ee] active:scale-95 shadow-soft transition-all cursor-pointer">
                +5,000
              </button>
              <button type="button" data-add="10000" class="quick-add-btn px-3 py-1 rounded-xl bg-white border border-[#ded9ce] text-[11px] font-bold text-[#52796f] hover:bg-[#edf4ee] active:scale-95 shadow-soft transition-all cursor-pointer">
                +10,000
              </button>
              <button type="button" id="btn-keypad-clear" class="px-2.5 py-1 rounded-xl bg-[#faedf0] border border-[#f0cdd5] text-[11px] font-bold text-[#c26d7f] active:scale-95 transition-all cursor-pointer" title="クリア">
                クリア
              </button>
            </div>
          </div>

          <!-- 2. 支払者トグル (夫 / 妻) -->
          <div>
            <div class="text-[11px] font-bold text-[#808781] mb-1.5 ml-1">誰が立替えた？</div>
            <div class="grid grid-cols-2 gap-2 bg-[#f4f1ea] p-1 rounded-2xl border border-[#ece8e1]">
              <button
                type="button"
                data-payer="${household.user1_name}"
                class="payer-btn py-2.5 rounded-xl text-xs font-extrabold transition-all bg-white text-[#3d637d] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i data-lucide="user" class="w-3.5 h-3.5"></i>
                <span>${household.user1_name}</span>
              </button>
              <button
                type="button"
                data-payer="${household.user2_name}"
                class="payer-btn py-2.5 rounded-xl text-xs font-extrabold transition-all text-[#8a857b] hover:text-[#2d312e] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i data-lucide="user" class="w-3.5 h-3.5"></i>
                <span>${household.user2_name}</span>
              </button>
            </div>
            <input type="hidden" id="input-payer" value="${household.user1_name}" />
          </div>

          <!-- 2-2. 負担方法 (個別負担設定) -->
          <div>
            <div class="flex items-center justify-between text-[11px] font-bold text-[#808781] mb-1.5 ml-1">
              <span>負担の分け方</span>
              <span id="label-selected-split" class="text-[10px] text-[#52796f] font-semibold">基本比率 (${household.ratio_user1}:${household.ratio_user2})</span>
            </div>
            <div class="grid grid-cols-4 gap-1 bg-[#f4f1ea] p-1 rounded-2xl border border-[#ece8e1]">
              <button
                type="button"
                data-split="ratio"
                class="split-btn py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all bg-white text-[#426b42] shadow-xs flex flex-col items-center justify-center cursor-pointer"
              >
                <span>基本比率</span>
                <span class="text-[9px] font-mono opacity-80">${household.ratio_user1}:${household.ratio_user2}</span>
              </button>
              <button
                type="button"
                data-split="equal"
                class="split-btn py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-[#8a857b] hover:text-[#2d312e] flex flex-col items-center justify-center cursor-pointer"
              >
                <span>等分</span>
                <span class="text-[9px] font-mono opacity-80">50:50</span>
              </button>
              <button
                type="button"
                data-split="user1_full"
                class="split-btn py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-[#8a857b] hover:text-[#2d312e] flex flex-col items-center justify-center cursor-pointer truncate"
              >
                <span class="truncate">${household.user1_name}</span>
                <span class="text-[9px] opacity-80">全額</span>
              </button>
              <button
                type="button"
                data-split="user2_full"
                class="split-btn py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-[#8a857b] hover:text-[#2d312e] flex flex-col items-center justify-center cursor-pointer truncate"
              >
                <span class="truncate">${household.user2_name}</span>
                <span class="text-[9px] opacity-80">全額</span>
              </button>
            </div>
            <input type="hidden" id="input-split-type" value="ratio" />
          </div>

          <!-- 3. カテゴリ選択 (くすみパステルの丸型チップ) -->
          <div>
            <div class="text-[11px] font-bold text-[#808781] mb-1.5 ml-1">カテゴリ</div>
            <div class="grid grid-cols-6 gap-1.5" id="category-selector">
              ${(Object.keys(CATEGORIES) as CategoryType[])
                .map((catKey, idx) => {
                  const cat = CATEGORIES[catKey];
                  const isFirst = idx === 0;
                  return `
                  <button
                    type="button"
                    data-category="${cat.id}"
                    class="category-btn p-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isFirst
                        ? 'border-[#52796f] bg-[#edf4ee] text-[#426b42] font-black shadow-xs ring-1 ring-[#52796f]/30'
                        : 'border-[#eeebe4] bg-[#fbfaf8] text-[#6d746f] hover:bg-[#f4f1ea]'
                    }"
                  >
                    <div class="w-7 h-7 rounded-xl flex items-center justify-center pointer-events-none" style="background-color: ${cat.color}20; color: ${cat.color};">
                      <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="text-[10px] leading-tight font-bold pointer-events-none">${cat.label}</span>
                  </button>
                `;
                })
                .join('')}
            </div>
            <input type="hidden" id="input-category" value="food" />
          </div>

          <!-- 4. メモ & 日付 -->
          <div class="grid grid-cols-5 gap-2">
            <div class="col-span-3">
              <input
                type="text"
                id="input-title"
                placeholder="メモ（任意: スーパー、カフェなど）"
                class="w-full px-3 py-2 bg-[#fbfaf8] border border-[#ded9ce] rounded-xl text-xs text-[#2d312e] focus:bg-white focus:border-[#52796f] outline-none transition-all placeholder-[#a8a29e]"
              />
            </div>
            <div class="col-span-2">
              <input
                type="date"
                id="input-date"
                value="${todayStr}"
                class="w-full px-2 py-2 bg-[#fbfaf8] border border-[#ded9ce] rounded-xl text-xs font-medium text-[#2d312e] focus:bg-white focus:border-[#52796f] outline-none transition-all"
              />
            </div>
          </div>

          <!-- 5. カスタムテンキー (4×3 電卓スタイル) -->
          <div class="bg-[#f7f5f0] p-2.5 rounded-[24px] border border-[#ece8e1] select-none">
            <div class="grid grid-cols-3 gap-2">
              <button type="button" data-num="1" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">1</button>
              <button type="button" data-num="2" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">2</button>
              <button type="button" data-num="3" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">3</button>

              <button type="button" data-num="4" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">4</button>
              <button type="button" data-num="5" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">5</button>
              <button type="button" data-num="6" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">6</button>

              <button type="button" data-num="7" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">7</button>
              <button type="button" data-num="8" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">8</button>
              <button type="button" data-num="9" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">9</button>

              <button type="button" data-num="00" class="keypad-num-btn keypad-btn h-12 bg-[#ede9e1] rounded-2xl text-base font-bold text-[#5c635e] shadow-soft flex items-center justify-center cursor-pointer">00</button>
              <button type="button" data-num="0" class="keypad-num-btn keypad-btn h-12 bg-white rounded-2xl text-lg font-black text-[#2d312e] shadow-soft flex items-center justify-center cursor-pointer">0</button>
              <button type="button" id="btn-keypad-backspace" class="keypad-btn h-12 bg-[#ede9e1] rounded-2xl text-[#5c635e] shadow-soft flex items-center justify-center active:bg-[#e2ded6] cursor-pointer" title="1文字消去">
                <i data-lucide="delete" class="w-5 h-5 pointer-events-none"></i>
              </button>
            </div>
          </div>
          </div>

          <!-- 6. 登録・保存ボタン (常に画面下部に固定表示され、スクロール不要) -->
          <div class="shrink-0 pt-3 bg-white border-t border-[#eeebe4]/80 mt-auto">
            <button
              type="submit"
              id="btn-submit-expense"
              class="w-full py-3.5 px-4 rounded-[20px] bg-gradient-to-r from-[#52796f] to-[#3d5a53] hover:from-[#486b62] hover:to-[#354f49] active:scale-[0.98] text-white font-extrabold text-sm shadow-floating flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <i data-lucide="check" class="w-4 h-4"></i>
              <span id="btn-submit-expense-text">この内容で記録する</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

