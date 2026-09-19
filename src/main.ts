import {
  createIcons,
  Settings,
  ArrowRight,
  CheckCircle,
  Share2,
  Check,
  Receipt,
  Trash2,
  PlusCircle,
  X,
  User,
  RefreshCw,
  Utensils,
  ShoppingBag,
  Zap,
  Coffee,
  Sparkles,
  MoreHorizontal,
  Users,
  Copy,
  CloudOff,
  Database,
  Delete,
} from 'lucide';
import { CategoryType, Expense, Household } from './types.ts';
import { LocalStorageService } from './services/storage.ts';
import { SupabaseService } from './services/supabaseService.ts';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from './supabase.ts';
import { calculateSettlement, generateLineSettlementText } from './logic/settlement.ts';
import { renderHeader } from './components/Header.ts';
import { renderSettlementCard } from './components/SettlementCard.ts';
import { renderCategoryBar } from './components/CategoryBar.ts';
import { renderExpenseList } from './components/ExpenseList.ts';
import { renderExpenseModal } from './components/ExpenseModal.ts';
import { renderSettingsModal } from './components/SettingsModal.ts';

// アプリケーション状態
let household: Household = LocalStorageService.getHousehold();
let expenses: Expense[] = LocalStorageService.getExpenses();
let showAllExpenses = false;
let isCloudSyncActive = false;

// トースト通知を表示する関数
function showToast(message: string, type: 'success' | 'info' | 'error' = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass =
    type === 'success'
      ? 'bg-[#2d312e] text-[#fbfaf8] border-[#454c47]'
      : type === 'error'
      ? 'bg-[#c26d7f] text-white border-[#d48393]'
      : 'bg-[#52796f] text-white border-[#679185]';

  toast.className = `${bgClass} px-4 py-3 rounded-2xl text-xs font-bold shadow-card border flex items-center gap-2 animate-slide-up pointer-events-auto transition-all`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}

// 現在の年月テキスト取得 (例: "2026年9月")
function getCurrentMonthText(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

// データのロード（クラウドまたはローカル）
async function loadData(): Promise<{ success: boolean; errorMsg?: string }> {
  const config = getSupabaseConfig();
  if (config) {
    try {
      const { userId, errorMsg } = await SupabaseService.ensureAuth();
      if (!userId) {
        return { success: false, errorMsg: errorMsg || '認証に失敗しました' };
      }

      let cloudHousehold = await SupabaseService.getHousehold();
      if (!cloudHousehold) {
        // 世帯がまだない場合は初期作成
        cloudHousehold = await SupabaseService.createHousehold(
          household.name,
          household.user1_name,
          household.user2_name
        );
      }

      if (cloudHousehold) {
        household = cloudHousehold;
        expenses = await SupabaseService.getExpenses();
        isCloudSyncActive = true;

        // リアルタイム変更購読の開始
        SupabaseService.subscribeToChanges(async () => {
          const updatedHousehold = await SupabaseService.getHousehold();
          if (updatedHousehold) household = updatedHousehold;
          expenses = await SupabaseService.getExpenses();
          renderApp();
        });
        return { success: true };
      } else {
        return { success: false, errorMsg: 'テーブルが見つかりません。SQL Editorで schema.sql を実行してください。' };
      }
    } catch (e: any) {
      console.warn('Cloud sync load failed, falling back to local', e);
      return { success: false, errorMsg: e?.message || '接続エラーが発生しました' };
    }
  }

  // フォールバック: ローカルストレージ
  isCloudSyncActive = false;
  household = LocalStorageService.getHousehold();
  expenses = LocalStorageService.getExpenses();
  return { success: true };
}

// 画面全体の描画
function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const settlementSummary = calculateSettlement(expenses, household);
  const monthText = getCurrentMonthText();
  const supabaseConfig = getSupabaseConfig();

  app.innerHTML = `
    ${renderHeader(monthText, isCloudSyncActive)}
    <main class="p-4 space-y-4 flex-1">
      ${renderSettlementCard(settlementSummary, household)}
      ${renderCategoryBar(expenses)}
      ${renderExpenseList(expenses, household, showAllExpenses)}
    </main>
    ${renderExpenseModal(household)}
    ${renderSettingsModal(household, supabaseConfig, isCloudSyncActive)}
  `;

  // Lucideアイコンの再描画 (Tree-shaking対応)
  createIcons({
    icons: {
      Settings,
      ArrowRight,
      CheckCircle,
      Share2,
      Check,
      Receipt,
      Trash2,
      PlusCircle,
      X,
      User,
      RefreshCw,
      Utensils,
      ShoppingBag,
      Zap,
      Coffee,
      Sparkles,
      MoreHorizontal,
      Users,
      Copy,
      CloudOff,
      Database,
      Delete,
    },
  });

  // イベントリスナーの再紐付け
  attachEventListeners(settlementSummary, monthText);
}

// イベントリスナーの登録
function attachEventListeners(settlementSummary: ReturnType<typeof calculateSettlement>, monthText: string) {
  // 1. 支出モーダル開閉 & テンキー状態管理
  const btnOpenModal = document.getElementById('btn-open-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalOverlay = document.getElementById('expense-modal-overlay');

  const displayAmount = document.getElementById('display-amount');
  const inputAmount = document.getElementById('input-amount') as HTMLInputElement;

  let currentAmountStr = '0';

  const updateAmountDisplay = () => {
    const val = parseInt(currentAmountStr, 10) || 0;
    if (displayAmount) {
      displayAmount.textContent = val.toLocaleString();
    }
    if (inputAmount) {
      inputAmount.value = val.toString();
    }
  };

  const openModal = () => {
    currentAmountStr = '0';
    updateAmountDisplay();
    const titleInput = document.getElementById('input-title') as HTMLInputElement;
    if (titleInput) titleInput.value = '';
    modalOverlay?.classList.remove('hidden');
  };

  const closeModal = () => {
    modalOverlay?.classList.add('hidden');
  };

  btnOpenModal?.addEventListener('click', openModal);
  btnCloseModal?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // テンキー数字入力
  const numButtons = document.querySelectorAll<HTMLButtonElement>('.keypad-num-btn');
  numButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = btn.dataset.num;
      if (!num) return;

      if (currentAmountStr === '0') {
        if (num === '00' || num === '0') return;
        currentAmountStr = num;
      } else {
        if (currentAmountStr.length >= 8) return; // 上限 99,999,999
        currentAmountStr += num;
      }
      updateAmountDisplay();
    });
  });

  // テンキー 1文字消去 (Backspace)
  const btnBackspace = document.getElementById('btn-keypad-backspace');
  btnBackspace?.addEventListener('click', () => {
    if (currentAmountStr.length > 1) {
      currentAmountStr = currentAmountStr.slice(0, -1);
    } else {
      currentAmountStr = '0';
    }
    updateAmountDisplay();
  });

  // テンキークリア (Clear)
  const btnClear = document.getElementById('btn-keypad-clear');
  btnClear?.addEventListener('click', () => {
    currentAmountStr = '0';
    updateAmountDisplay();
  });

  // クイック加算 (+1,000, +5,000, +10,000)
  const quickAddButtons = document.querySelectorAll<HTMLButtonElement>('.quick-add-btn');
  quickAddButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const addVal = parseInt(btn.dataset.add || '0', 10);
      const cur = parseInt(currentAmountStr, 10) || 0;
      const next = Math.min(cur + addVal, 99999999);
      currentAmountStr = next.toString();
      updateAmountDisplay();
    });
  });

  // 2. 支払者トグル (夫 / 妻)
  const payerButtons = document.querySelectorAll<HTMLButtonElement>('.payer-btn');
  const inputPayer = document.getElementById('input-payer') as HTMLInputElement;

  payerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const payer = btn.dataset.payer;
      if (!payer || !inputPayer) return;

      inputPayer.value = payer;
      const isUser1 = payer === household.user1_name;

      payerButtons.forEach((b) => {
        b.className =
          'payer-btn py-2.5 rounded-xl text-xs font-extrabold transition-all text-[#8a857b] hover:text-[#2d312e] flex items-center justify-center gap-1.5 cursor-pointer';
      });

      if (isUser1) {
        btn.className =
          'payer-btn py-2.5 rounded-xl text-xs font-extrabold transition-all bg-white text-[#3d637d] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer';
      } else {
        btn.className =
          'payer-btn py-2.5 rounded-xl text-xs font-extrabold transition-all bg-white text-[#9c4c5e] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer';
      }
    });
  });

  // 3. カテゴリ選択
  const catButtons = document.querySelectorAll<HTMLButtonElement>('.category-btn');
  const inputCategory = document.getElementById('input-category') as HTMLInputElement;

  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category as CategoryType;
      if (!cat || !inputCategory) return;

      inputCategory.value = cat;
      catButtons.forEach((b) => {
        b.classList.remove('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-xs', 'ring-1', 'ring-[#52796f]/30');
        b.classList.add('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
      });
      btn.classList.add('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-xs', 'ring-1', 'ring-[#52796f]/30');
      btn.classList.remove('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
    });
  });

  // 4. 支出フォーム送信 (二重送信防止・不正金額バリデーション付き)
  const formExpense = document.getElementById('form-expense') as HTMLFormElement;
  const btnSubmitExpense = document.getElementById('btn-submit-expense') as HTMLButtonElement;
  let isSubmitting = false;

  formExpense?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // 二重送信ガード

    const amountInput = document.getElementById('input-amount') as HTMLInputElement;
    const payerInput = document.getElementById('input-payer') as HTMLInputElement;
    const catInput = document.getElementById('input-category') as HTMLInputElement;
    const titleInput = document.getElementById('input-title') as HTMLInputElement;
    const dateInput = document.getElementById('input-date') as HTMLInputElement;

    const amount = parseInt(amountInput.value, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('1円以上の金額を入力してください', 'error');
      return;
    }

    if (amount > 99999999) {
      showToast('金額が大きすぎます (9,999万円まで)', 'error');
      return;
    }

    isSubmitting = true;
    if (btnSubmitExpense) {
      btnSubmitExpense.disabled = true;
      btnSubmitExpense.classList.add('opacity-70', 'cursor-not-allowed');
    }

    try {
      const payload = {
        household_id: household.id,
        title: titleInput.value.trim().slice(0, 100), // 最大100文字に制限
        amount: amount,
        category: (catInput.value as CategoryType) || 'food',
        paid_by_name: payerInput.value || household.user1_name,
        expense_date: dateInput.value || new Date().toISOString().split('T')[0],
        is_settled: false,
      };

      if (isCloudSyncActive) {
        await SupabaseService.addExpense(payload);
        expenses = await SupabaseService.getExpenses();
      } else {
        LocalStorageService.addExpense(payload);
        expenses = LocalStorageService.getExpenses();
      }

      closeModal();
      renderApp();
      showToast(`¥${amount.toLocaleString()} の支出を記録しました 🎉`);
    } catch (err) {
      console.error('Failed to submit expense', err);
      showToast('記録に失敗しました。もう一度お試しください', 'error');
    } finally {
      isSubmitting = false;
      if (btnSubmitExpense) {
        btnSubmitExpense.disabled = false;
        btnSubmitExpense.classList.remove('opacity-70', 'cursor-not-allowed');
      }
    }
  });

  // 5. 支出削除ボタン
  document.querySelectorAll<HTMLButtonElement>('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteId;
      if (!id) return;
      if (confirm('この支出を削除しますか？')) {
        if (isCloudSyncActive) {
          await SupabaseService.deleteExpense(id);
          expenses = await SupabaseService.getExpenses();
        } else {
          LocalStorageService.deleteExpense(id);
          expenses = LocalStorageService.getExpenses();
        }
        renderApp();
        showToast('支出を削除しました');
      }
    });
  });

  // 6. LINE請求文面コピー
  const btnCopyLine = document.getElementById('btn-copy-line');
  btnCopyLine?.addEventListener('click', async () => {
    const text = generateLineSettlementText(settlementSummary, household, monthText);
    try {
      await navigator.clipboard.writeText(text);
      showToast('LINE請求文をクリップボードにコピーしました！ 📋');
    } catch (err) {
      console.warn('Clipboard API error, fallback prompt', err);
      prompt('以下のテキストをコピーしてください:', text);
    }
  });

  // 7. 精算完了ボタン
  const btnSettleAll = document.getElementById('btn-settle-all');
  btnSettleAll?.addEventListener('click', async () => {
    const unsettledCount = expenses.filter((e) => !e.is_settled).length;
    if (unsettledCount === 0) {
      showToast('未精算の支出はありません', 'info');
      return;
    }

    if (confirm(`未精算の支出（${unsettledCount}件）をすべて精算済みにしますか？`)) {
      if (isCloudSyncActive) {
        await SupabaseService.settleAll(household.id);
        expenses = await SupabaseService.getExpenses();
      } else {
        LocalStorageService.settleAll();
        expenses = LocalStorageService.getExpenses();
      }
      renderApp();
      showToast('今月の精算を完了しました！✨');
    }
  });

  // 8. 支出リスト表示切替（未精算のみ / すべて）
  const btnToggleShowAll = document.getElementById('btn-toggle-show-all');
  btnToggleShowAll?.addEventListener('click', () => {
    showAllExpenses = !showAllExpenses;
    renderApp();
  });

  // 9. 設定モーダル開閉
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsModalOverlay = document.getElementById('settings-modal-overlay');

  btnOpenSettings?.addEventListener('click', () => {
    settingsModalOverlay?.classList.remove('hidden');
  });

  btnCloseSettings?.addEventListener('click', () => {
    settingsModalOverlay?.classList.add('hidden');
  });

  settingsModalOverlay?.addEventListener('click', (e) => {
    if (e.target === settingsModalOverlay) settingsModalOverlay.classList.add('hidden');
  });

  // 負担割合スライダー連動
  const ratioSlider = document.getElementById('settings-ratio-slider') as HTMLInputElement;
  const ratioDisplay = document.getElementById('settings-ratio-display');
  const user1Input = document.getElementById('settings-user1-name') as HTMLInputElement;
  const user2Input = document.getElementById('settings-user2-name') as HTMLInputElement;

  const updateRatioDisplay = () => {
    if (!ratioSlider || !ratioDisplay || !user1Input || !user2Input) return;
    const r1 = parseInt(ratioSlider.value, 10);
    const r2 = 100 - r1;
    const u1 = user1Input.value.trim() || 'メンバー1';
    const u2 = user2Input.value.trim() || 'メンバー2';
    ratioDisplay.textContent = `${u1} ${r1}% : ${u2} ${r2}%`;
  };

  ratioSlider?.addEventListener('input', updateRatioDisplay);
  user1Input?.addEventListener('input', updateRatioDisplay);
  user2Input?.addEventListener('input', updateRatioDisplay);

  // 10. 世帯設定フォーム保存
  const formSettings = document.getElementById('form-settings') as HTMLFormElement;
  formSettings?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r1 = parseInt(ratioSlider.value, 10);
    const r2 = 100 - r1;

    household = {
      ...household,
      user1_name: user1Input.value.trim() || '夫',
      user2_name: user2Input.value.trim() || '妻',
      ratio_user1: r1,
      ratio_user2: r2,
    };

    if (isCloudSyncActive) {
      await SupabaseService.updateHousehold(household);
    } else {
      LocalStorageService.saveHousehold(household);
    }

    settingsModalOverlay?.classList.add('hidden');
    renderApp();
    showToast('世帯設定を保存しました ⚙️');
  });

  // 11. 世帯招待コードのコピー
  const btnCopyJoinCode = document.getElementById('btn-copy-join-code');
  btnCopyJoinCode?.addEventListener('click', async () => {
    const code = btnCopyJoinCode.dataset.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showToast(`招待コード【${code}】をコピーしました！`);
    } catch {
      prompt('招待コード:', code);
    }
  });

  // 12. 世帯参加（招待コード入力）
  const btnJoinHousehold = document.getElementById('btn-join-household');
  const inputJoinCode = document.getElementById('input-join-code') as HTMLInputElement;
  btnJoinHousehold?.addEventListener('click', async () => {
    const code = inputJoinCode?.value.trim();
    if (!code) {
      showToast('招待コードを入力してください', 'error');
      return;
    }
    if (!isCloudSyncActive) {
      showToast('先にSupabase連携を行ってください', 'error');
      return;
    }

    showToast('世帯を検索中...', 'info');
    const joined = await SupabaseService.joinHouseholdByCode(code, household.user2_name);
    if (joined) {
      household = joined;
      expenses = await SupabaseService.getExpenses();
      settingsModalOverlay?.classList.add('hidden');
      renderApp();
      showToast(`世帯「${joined.name}」に参加しました！🎉`);
    } else {
      showToast('指定された招待コードの世帯が見つかりませんでした', 'error');
    }
  });

  // 13. Supabase設定保存フォーム
  const formSupabase = document.getElementById('form-supabase-config') as HTMLFormElement;
  formSupabase?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const urlInput = document.getElementById('supabase-url') as HTMLInputElement;
    const keyInput = document.getElementById('supabase-anon-key') as HTMLInputElement;

    const url = urlInput.value.trim();
    const anonKey = keyInput.value.trim();

    saveSupabaseConfig({ url, anonKey });
    showToast('Supabase接続をテスト中...', 'info');

    const result = await loadData();
    renderApp();

    if (result.success && isCloudSyncActive) {
      settingsModalOverlay?.classList.add('hidden');
      showToast('Supabaseクラウド同期が有効になりました！🟢');
    } else {
      showToast(result.errorMsg || '接続に失敗しました。URLとキーを確認してください', 'error');
    }
  });

  // 14. Supabase接続解除
  const btnDisconnect = document.getElementById('btn-disconnect-supabase');
  btnDisconnect?.addEventListener('click', () => {
    if (confirm('Supabaseとの連携を解除し、ローカルモードに戻しますか？')) {
      SupabaseService.unsubscribe();
      clearSupabaseConfig();
      isCloudSyncActive = false;
      household = LocalStorageService.getHousehold();
      expenses = LocalStorageService.getExpenses();
      settingsModalOverlay?.classList.add('hidden');
      renderApp();
      showToast('ローカルモードに切り替えました');
    }
  });

  // 15. ローカルデータリセット
  const btnResetData = document.getElementById('btn-reset-data');
  btnResetData?.addEventListener('click', () => {
    if (confirm('ローカルデータをサンプル状態にリセットしますか？')) {
      LocalStorageService.resetAll();
      household = LocalStorageService.getHousehold();
      expenses = LocalStorageService.getExpenses();
      settingsModalOverlay?.classList.add('hidden');
      renderApp();
      showToast('サンプルデータに初期化しました');
    }
  });
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderApp();
});
