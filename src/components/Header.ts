export function renderHeader(isCloudSync: boolean = false): string {
  return `
    <header class="sticky top-0 z-20 bg-[#fbfaf8]/92 backdrop-blur-md border-b border-[#ece8e1] px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <img
          src="./icon-192.png"
          alt="PairPay Logo"
          class="w-9 h-9 rounded-2xl object-cover shadow-soft border border-[#ece8e1] shrink-0"
        />
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
        <button id="btn-open-settings" class="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#5c635e] hover:text-[#2d312e] active:scale-95 transition-all shadow-soft border border-[#ece8e1] cursor-pointer" aria-label="設定">
          <i data-lucide="settings" class="w-4 h-4"></i>
        </button>
      </div>
    </header>
  `;
}

