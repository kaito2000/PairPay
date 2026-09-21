export function renderHeader(
  isCloudSync: boolean = false,
  pendingSyncCount: number = 0,
  isOnline: boolean = true
): string {
  let badgeHtml = '';

  if (!isOnline) {
    badgeHtml = `
      <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#faedf0] text-[#9c4c5e] border border-[#f0cdd5]">
        <span class="w-1.5 h-1.5 rounded-full bg-[#c26d7f]"></span>
        オフライン ${pendingSyncCount > 0 ? `(未同期${pendingSyncCount}件)` : ''}
      </span>
    `;
  } else if (pendingSyncCount > 0) {
    badgeHtml = `
      <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#faf3e8] text-[#9c631e] border border-[#edd8ba]">
        <span class="w-1.5 h-1.5 rounded-full bg-[#cb8634] animate-pulse"></span>
        同期待機中 (${pendingSyncCount}件)
      </span>
    `;
  } else if (isCloudSync) {
    badgeHtml = `
      <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#edf4ee] text-[#426b42] border border-[#c8decb]">
        <span class="w-1.5 h-1.5 rounded-full bg-[#52796f] animate-pulse"></span>
        クラウド同期中
      </span>
    `;
  } else {
    badgeHtml = `
      <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0ece5] text-[#78716c] border border-[#e2dcd5]">
        <span class="w-1.5 h-1.5 rounded-full bg-[#a8a29e]"></span>
        ローカル
      </span>
    `;
  }

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
            ${badgeHtml}
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

