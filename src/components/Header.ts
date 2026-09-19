export function renderHeader(monthText: string, isCloudSync: boolean = false): string {
  return `
    <header class="sticky top-0 z-20 bg-[#fbfaf8]/90 backdrop-blur-md border-b border-[#ece8e1] px-4 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#52796f] to-[#74a892] flex items-center justify-center text-white font-extrabold shadow-sm shadow-[#52796f]/20 text-sm">
          P
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base font-extrabold tracking-tight text-[#2d312e] leading-tight">PairPay</h1>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isCloudSync
                ? 'bg-[#edf4ee] text-[#426b42] border border-[#c8decb]'
                : 'bg-[#f0ece5] text-[#78716c] border border-[#e2dcd5]'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${isCloudSync ? 'bg-[#52796f] animate-pulse' : 'bg-[#a8a29e]'}"></span>
              ${isCloudSync ? 'クラウド同期中' : 'ローカル'}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-[#5c635e] bg-white px-3 py-1 rounded-full border border-[#e7e3dc] shadow-soft" id="current-month-badge">
          ${monthText}
        </span>
        <button id="btn-open-settings" class="w-9 h-9 rounded-full flex items-center justify-center text-[#5c635e] hover:text-[#2d312e] hover:bg-white active:scale-95 transition-all shadow-soft" aria-label="設定">
          <i data-lucide="settings" class="w-4 h-4"></i>
        </button>
      </div>
    </header>
  `;
}
