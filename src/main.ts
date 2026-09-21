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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  List,
  Calculator,
  Info,
  Pencil,
  History,
  Repeat,
  FileText,
  Download,
  Inbox,
  CalendarCheck,
} from 'lucide';

import { CategoryType, Expense, Household, RecurringTemplate, SettlementLog, SplitType } from './types.ts';
import { LocalStorageService } from './services/storage.ts';
import { SupabaseService } from './services/supabaseService.ts';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from './supabase.ts';
import {
  calculateSettlement,
  generateLineSettlementText,
  getCurrentYearMonth,
  formatYearMonth,
  shiftMonth,
  filterExpensesByMonth,
  getAvailableMonths,
} from './logic/settlement.ts';
import { renderHeader } from './components/Header.ts';
import { renderMonthNavigator } from './components/MonthNavigator.ts';
import { renderSettlementCard } from './components/SettlementCard.ts';
import { renderCategoryBar } from './components/CategoryBar.ts';
import { renderExpenseList } from './components/ExpenseList.ts';
import { renderExpenseModal } from './components/ExpenseModal.ts';
import { renderSettingsModal } from './components/SettingsModal.ts';
import { renderSettlementHistoryModal } from './components/SettlementHistoryModal.ts';
import { renderRecurringModal } from './components/RecurringModal.ts';
import { downloadExpensesCsv } from './utils/csv.ts';
import { SyncQueueService } from './services/syncQueue.ts';

// アプリケーション状態
let household: Household = LocalStorageService.getHousehold();
let expenses: Expense[] = LocalStorageService.getExpenses();
let settlementLogs: SettlementLog[] = LocalStorageService.getSettlementLogs();
let recurringTemplates: RecurringTemplate[] = LocalStorageService.getRecurringTemplates();
let selectedYearMonth: string = getCurrentYearMonth();
let showAllExpenses = false;
let isCloudSyncActive = false;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

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
  const span = document.createElement('span');
  span.textContent = message;
  toast.appendChild(span);

  container.appendChild(toast);


  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 2500);
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

        // 精算ログ & 固定費テンプレートのロード
        const cloudLogs = await SupabaseService.getSettlementLogs();
        if (cloudLogs && cloudLogs.length > 0) {
          settlementLogs = cloudLogs;
        } else {
          settlementLogs = LocalStorageService.getSettlementLogs();
        }

        const cloudRecurring = await SupabaseService.getRecurringTemplates();
        if (cloudRecurring && cloudRecurring.length > 0) {
          recurringTemplates = cloudRecurring;
        } else {
          recurringTemplates = LocalStorageService.getRecurringTemplates();
        }

        isCloudSyncActive = true;

        // リアルタイム変更購読の開始
        SupabaseService.subscribeToChanges(async () => {
          const updatedHousehold = await SupabaseService.getHousehold();
          if (updatedHousehold) household = updatedHousehold;
          expenses = await SupabaseService.getExpenses();
          const updatedLogs = await SupabaseService.getSettlementLogs();
          if (updatedLogs && updatedLogs.length > 0) settlementLogs = updatedLogs;
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
  settlementLogs = LocalStorageService.getSettlementLogs();
  recurringTemplates = LocalStorageService.getRecurringTemplates();
  return { success: true };
}

// 画面全体の描画
function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const currentYM = getCurrentYearMonth();
  const selectedMonthLabel = formatYearMonth(selectedYearMonth);
  const availableMonths = getAvailableMonths(expenses, currentYM, selectedYearMonth);

  // 選択月の支出データ
  const monthlyExpenses = filterExpensesByMonth(expenses, selectedYearMonth);
  const unsettledInMonth = monthlyExpenses.filter((e) => !e.is_settled);
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 選択月に対する精算計算
  const settlementSummary = calculateSettlement(unsettledInMonth, household);
  const supabaseConfig = getSupabaseConfig();

  app.innerHTML = `
    ${renderHeader(isCloudSyncActive, SyncQueueService.getPendingCount(), isOnline)}
    <main class="p-4 space-y-3.5 flex-1">
      ${renderMonthNavigator(selectedYearMonth, currentYM, availableMonths)}
      ${renderSettlementCard(settlementSummary, household, selectedMonthLabel, unsettledInMonth.length, monthlyTotal)}
      ${renderCategoryBar(monthlyExpenses, selectedMonthLabel)}
      ${renderExpenseList(monthlyExpenses, household, showAllExpenses, selectedMonthLabel)}
    </main>
    ${renderExpenseModal(household)}
    ${renderSettingsModal(household, supabaseConfig, isCloudSyncActive, selectedYearMonth)}
    ${renderSettlementHistoryModal(settlementLogs)}
    ${renderRecurringModal(recurringTemplates, household, selectedYearMonth)}
  `;

  // プルダウンの値を確実に選択中の月に設定（ブラウザキャッシュ対策）
  const selectMonthDropdown = document.getElementById('select-month-dropdown') as HTMLSelectElement;
  if (selectMonthDropdown) {
    selectMonthDropdown.value = selectedYearMonth;
  }


  // Lucideアイコンの再描画
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
      ChevronLeft,
      ChevronRight,
      ChevronDown,
      Calendar,
      Filter,
      List,
      Calculator,
      Info,
      Pencil,
      History,
      Repeat,
      FileText,
      Download,
      Inbox,
      CalendarCheck,
    },
  });


  // イベントリスナーの再紐付け
  attachEventListeners(settlementSummary, selectedMonthLabel, unsettledInMonth.length);
}

// イベントリスナーの登録
function attachEventListeners(
  settlementSummary: ReturnType<typeof calculateSettlement>,
  selectedMonthLabel: string,
  unsettledCountInMonth: number
) {
  // 1. 月ナビゲーターのイベント
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const btnCurrentMonth = document.getElementById('btn-current-month');
  const selectMonthDropdown = document.getElementById('select-month-dropdown') as HTMLSelectElement;

  btnPrevMonth?.addEventListener('click', () => {
    selectedYearMonth = shiftMonth(selectedYearMonth, -1);
    renderApp();
  });

  btnNextMonth?.addEventListener('click', () => {
    selectedYearMonth = shiftMonth(selectedYearMonth, 1);
    renderApp();
  });

  btnCurrentMonth?.addEventListener('click', () => {
    selectedYearMonth = getCurrentYearMonth();
    renderApp();
  });

  selectMonthDropdown?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    if (target.value) {
      selectedYearMonth = target.value;
      renderApp();
    }
  });

  // 2. 支出モーダル開閉 & テンキー状態管理
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

  const openModal = (expenseId?: string) => {
    const inputExpenseId = document.getElementById('input-expense-id') as HTMLInputElement;
    const modalTitle = document.getElementById('modal-expense-title');
    const btnHeaderSaveText = document.getElementById('btn-header-save-text');
    const titleInput = document.getElementById('input-title') as HTMLInputElement;
    const dateInput = document.getElementById('input-date') as HTMLInputElement;
    const inputPayer = document.getElementById('input-payer') as HTMLInputElement;
    const inputCategory = document.getElementById('input-category') as HTMLInputElement;
    const inputSplitType = document.getElementById('input-split-type') as HTMLInputElement;
    const labelSelectedSplit = document.getElementById('label-selected-split');
    const splitButtons = document.querySelectorAll<HTMLButtonElement>('.split-btn');

    const updateSplitUI = (split: SplitType) => {
      if (inputSplitType) inputSplitType.value = split;
      if (labelSelectedSplit) {
        if (split === 'equal') labelSelectedSplit.textContent = '等分 (50:50)';
        else if (split === 'user1_full') labelSelectedSplit.textContent = `${household.user1_name}が全額`;
        else if (split === 'user2_full') labelSelectedSplit.textContent = `${household.user2_name}が全額`;
        else labelSelectedSplit.textContent = `基本比率 (${household.ratio_user1}:${household.ratio_user2})`;
      }
      splitButtons.forEach((b) => {
        const match = b.dataset.split === split;
        if (match) {
          b.className =
            'split-btn py-1.5 px-0.5 rounded-lg text-[10px] font-extrabold transition-all bg-white text-[#426b42] shadow-2xs flex flex-col items-center justify-center cursor-pointer';
        } else {
          b.className =
            'split-btn py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all text-[#8a857b] hover:text-[#2d312e] flex flex-col items-center justify-center cursor-pointer min-w-0';
        }
      });
    };

    if (expenseId) {
      // 編集モード
      const exp = expenses.find((e) => e.id === expenseId);
      if (!exp) return;

      if (inputExpenseId) inputExpenseId.value = exp.id;
      if (modalTitle) modalTitle.textContent = '支出を編集する';
      if (btnHeaderSaveText) btnHeaderSaveText.textContent = '保存';

      currentAmountStr = exp.amount.toString();
      updateAmountDisplay();

      if (titleInput) titleInput.value = exp.title || '';
      if (dateInput) dateInput.value = exp.expense_date;

      updateSplitUI(exp.split_type || 'ratio');

      if (inputPayer) {
        inputPayer.value = exp.paid_by_name;
        payerButtons.forEach((b) => {
          const isUser1 = exp.paid_by_name === household.user1_name;
          const match = b.dataset.payer === exp.paid_by_name;
          if (match) {
            b.className = `payer-btn py-1.5 rounded-lg text-xs font-extrabold transition-all bg-white ${
              isUser1 ? 'text-[#3d637d]' : 'text-[#9c4c5e]'
            } shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer truncate`;
          } else {
            b.className =
              'payer-btn py-1.5 rounded-lg text-xs font-extrabold transition-all text-[#8a857b] hover:text-[#2d312e] flex items-center justify-center gap-1.5 cursor-pointer truncate';
          }
        });
      }

      if (inputCategory) {
        inputCategory.value = exp.category;
        catButtons.forEach((b) => {
          if (b.dataset.category === exp.category) {
            b.classList.add('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-2xs', 'ring-1', 'ring-[#52796f]/30');
            b.classList.remove('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
          } else {
            b.classList.remove('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-2xs', 'ring-1', 'ring-[#52796f]/30');
            b.classList.add('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
          }
        });
      }
    } else {
      // 新規登録モード
      if (inputExpenseId) inputExpenseId.value = '';
      if (modalTitle) modalTitle.textContent = '支出を記録する';
      if (btnHeaderSaveText) btnHeaderSaveText.textContent = '保存';

      currentAmountStr = '0';
      updateAmountDisplay();
      if (titleInput) titleInput.value = '';

      updateSplitUI('ratio');

      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        if (today.startsWith(selectedYearMonth)) {
          dateInput.value = today;
        } else {
          dateInput.value = `${selectedYearMonth}-01`;
        }
      }

      if (inputPayer) {
        inputPayer.value = household.user1_name;
        payerButtons.forEach((b, idx) => {
          if (idx === 0) {
            b.className =
              'payer-btn py-1.5 rounded-lg text-xs font-extrabold transition-all bg-white text-[#3d637d] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer truncate';
          } else {
            b.className =
              'payer-btn py-1.5 rounded-lg text-xs font-extrabold transition-all text-[#8a857b] hover:text-[#2d312e] flex items-center justify-center gap-1.5 cursor-pointer truncate';
          }
        });
      }

      if (inputCategory) {
        inputCategory.value = 'food';
        catButtons.forEach((b, idx) => {
          if (idx === 0) {
            b.classList.add('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-2xs', 'ring-1', 'ring-[#52796f]/30');
            b.classList.remove('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
          } else {
            b.classList.remove('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-xs', 'ring-1', 'ring-[#52796f]/30');
            b.classList.add('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
          }
        });
      }
    }

    modalOverlay?.classList.remove('hidden');
  };

  const closeModal = () => {
    modalOverlay?.classList.add('hidden');
  };

  btnOpenModal?.addEventListener('click', () => openModal());
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

  // 3. 支払者トグル (夫 / 妻)
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
          'payer-btn py-1.5 rounded-lg text-xs font-extrabold transition-all text-[#8a857b] hover:text-[#2d312e] flex items-center justify-center gap-1.5 cursor-pointer truncate';
      });

      if (isUser1) {
        btn.className =
          'payer-btn py-1.5 rounded-lg text-xs font-extrabold transition-all bg-white text-[#3d637d] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer truncate';
      } else {
        btn.className =
          'payer-btn py-1.5 rounded-lg text-xs font-extrabold transition-all bg-white text-[#9c4c5e] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer truncate';
      }
    });
  });

  // 4. カテゴリ選択
  const catButtons = document.querySelectorAll<HTMLButtonElement>('.category-btn');
  const inputCategory = document.getElementById('input-category') as HTMLInputElement;

  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category as CategoryType;
      if (!cat || !inputCategory) return;

      inputCategory.value = cat;
      catButtons.forEach((b) => {
        b.classList.remove('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-2xs', 'ring-1', 'ring-[#52796f]/30');
        b.classList.add('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
      });
      btn.classList.add('border-[#52796f]', 'bg-[#edf4ee]', 'text-[#426b42]', 'font-black', 'shadow-2xs', 'ring-1', 'ring-[#52796f]/30');
      btn.classList.remove('border-[#eeebe4]', 'bg-[#fbfaf8]', 'text-[#6d746f]');
    });
  });

  // 4-2. 負担方法選択 (split_type)
  const splitButtons = document.querySelectorAll<HTMLButtonElement>('.split-btn');
  const inputSplitType = document.getElementById('input-split-type') as HTMLInputElement;
  const labelSelectedSplit = document.getElementById('label-selected-split');

  splitButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const split = (btn.dataset.split as SplitType) || 'ratio';
      if (inputSplitType) inputSplitType.value = split;
      if (labelSelectedSplit) {
        if (split === 'equal') labelSelectedSplit.textContent = '等分 (50:50)';
        else if (split === 'user1_full') labelSelectedSplit.textContent = `${household.user1_name}が全額`;
        else if (split === 'user2_full') labelSelectedSplit.textContent = `${household.user2_name}が全額`;
        else labelSelectedSplit.textContent = `基本比率 (${household.ratio_user1}:${household.ratio_user2})`;
      }
      splitButtons.forEach((b) => {
        const match = b.dataset.split === split;
        if (match) {
          b.className =
            'split-btn py-1.5 px-0.5 rounded-lg text-[10px] font-extrabold transition-all bg-white text-[#426b42] shadow-2xs flex flex-col items-center justify-center cursor-pointer';
        } else {
          b.className =
            'split-btn py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all text-[#8a857b] hover:text-[#2d312e] flex flex-col items-center justify-center cursor-pointer min-w-0';
        }
      });
    });
  });

  // 5. 支出フォーム送信
  const formExpense = document.getElementById('form-expense') as HTMLFormElement;
  const btnSubmitExpense = document.getElementById('btn-submit-expense') as HTMLButtonElement | null;
  const btnHeaderSave = document.getElementById('btn-header-save-expense') as HTMLButtonElement | null;
  let isSubmitting = false;

  btnHeaderSave?.addEventListener('click', () => {
    formExpense?.requestSubmit();
  });

  formExpense?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const amountInput = document.getElementById('input-amount') as HTMLInputElement;
    const payerInput = document.getElementById('input-payer') as HTMLInputElement;
    const catInput = document.getElementById('input-category') as HTMLInputElement;
    const titleInput = document.getElementById('input-title') as HTMLInputElement;
    const dateInput = document.getElementById('input-date') as HTMLInputElement;
    const splitInput = document.getElementById('input-split-type') as HTMLInputElement;

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
    if (btnHeaderSave) {
      btnHeaderSave.disabled = true;
      btnHeaderSave.classList.add('opacity-60', 'pointer-events-none');
    }
    if (btnSubmitExpense) {
      btnSubmitExpense.disabled = true;
      btnSubmitExpense.classList.add('opacity-70', 'cursor-not-allowed');
    }

    try {
      const expenseDate = dateInput.value || new Date().toISOString().split('T')[0];
      const inputExpenseId = (document.getElementById('input-expense-id') as HTMLInputElement)?.value;
      const splitType = (splitInput?.value as SplitType) || 'ratio';

      if (inputExpenseId) {
        // 既存の支出を編集・更新
        const existing = expenses.find((e) => e.id === inputExpenseId);
        const payload: Expense = {
          id: inputExpenseId,
          household_id: household.id,
          title: titleInput.value.trim().slice(0, 100),
          amount: amount,
          category: (catInput.value as CategoryType) || 'food',
          paid_by_name: payerInput.value || household.user1_name,
          expense_date: expenseDate,
          is_settled: existing ? existing.is_settled : false,
          split_type: splitType,
          created_at: existing ? existing.created_at : new Date().toISOString(),
        };

        if (isCloudSyncActive && isOnline) {
          try {
            await SupabaseService.updateExpense(payload);
            expenses = await SupabaseService.getExpenses();
          } catch (e) {
            console.warn('Online update failed, enqueuing', e);
            SyncQueueService.enqueue('update_expense', payload);
            LocalStorageService.updateExpense(payload);
            expenses = LocalStorageService.getExpenses();
          }
        } else {
          if (isCloudSyncActive) {
            SyncQueueService.enqueue('update_expense', payload);
          }
          LocalStorageService.updateExpense(payload);
          expenses = LocalStorageService.getExpenses();
        }

        const enteredYM = expenseDate.substring(0, 7);
        selectedYearMonth = enteredYM;

        closeModal();
        renderApp();
        showToast(`¥${amount.toLocaleString()} の支出内容を更新しました ✏️`);
      } else {
        // 新規登録
        const payload = {
          household_id: household.id,
          title: titleInput.value.trim().slice(0, 100),
          amount: amount,
          category: (catInput.value as CategoryType) || 'food',
          paid_by_name: payerInput.value || household.user1_name,
          expense_date: expenseDate,
          is_settled: false,
          split_type: splitType,
        };

        if (isCloudSyncActive && isOnline) {
          try {
            const added = await SupabaseService.addExpense(payload);
            if (added) {
              expenses = await SupabaseService.getExpenses();
            } else {
              SyncQueueService.enqueue('create_expense', payload);
              LocalStorageService.addExpense(payload);
              expenses = LocalStorageService.getExpenses();
            }
          } catch (e) {
            console.warn('Online add failed, enqueuing', e);
            SyncQueueService.enqueue('create_expense', payload);
            LocalStorageService.addExpense(payload);
            expenses = LocalStorageService.getExpenses();
          }
        } else {
          if (isCloudSyncActive) {
            SyncQueueService.enqueue('create_expense', payload);
          }
          LocalStorageService.addExpense(payload);
          expenses = LocalStorageService.getExpenses();
        }

        // 入力した日付の月に自動移動して確認できるようにする
        const enteredYM = expenseDate.substring(0, 7);
        selectedYearMonth = enteredYM;

        closeModal();
        renderApp();
        showToast(`¥${amount.toLocaleString()} の支出を記録しました 🎉`);
      }
    } catch (err) {

      console.error('Failed to submit expense', err);
      showToast('記録に失敗しました。もう一度お試しください', 'error');
    } finally {
      isSubmitting = false;
      if (btnHeaderSave) {
        btnHeaderSave.disabled = false;
        btnHeaderSave.classList.remove('opacity-60', 'pointer-events-none');
      }
      if (btnSubmitExpense) {
        btnSubmitExpense.disabled = false;
        btnSubmitExpense.classList.remove('opacity-70', 'cursor-not-allowed');
      }
    }
  });

  // 5.5 支出編集ボタン
  document.querySelectorAll<HTMLButtonElement>('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editId;
      if (id) openModal(id);
    });
  });

  // 6. 支出削除ボタン
  document.querySelectorAll<HTMLButtonElement>('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteId;
      if (!id) return;
      if (confirm('この支出を削除しますか？')) {
        if (isCloudSyncActive && isOnline) {
          try {
            await SupabaseService.deleteExpense(id);
            expenses = await SupabaseService.getExpenses();
          } catch (e) {
            console.warn('Online delete failed, enqueuing', e);
            SyncQueueService.enqueue('delete_expense', { id });
            LocalStorageService.deleteExpense(id);
            expenses = LocalStorageService.getExpenses();
          }
        } else {
          if (isCloudSyncActive) {
            SyncQueueService.enqueue('delete_expense', { id });
          }
          LocalStorageService.deleteExpense(id);
          expenses = LocalStorageService.getExpenses();
        }
        renderApp();
        showToast('支出を削除しました');
      }
    });
  });

  // 7. LINE請求文面コピー
  const btnCopyLine = document.getElementById('btn-copy-line');
  btnCopyLine?.addEventListener('click', async () => {
    const text = generateLineSettlementText(settlementSummary, household, selectedMonthLabel);
    try {
      await navigator.clipboard.writeText(text);
      showToast('LINE請求文をクリップボードにコピーしました！ 📋');
    } catch (err) {
      console.warn('Clipboard API error, fallback prompt', err);
      prompt('以下のテキストをコピーしてください:', text);
    }
  });

  // 8. 精算完了ボタン (選択月の未精算を精算済みにし、精算ログを記録)
  const btnSettleAll = document.getElementById('btn-settle-all');
  btnSettleAll?.addEventListener('click', async () => {
    if (unsettledCountInMonth === 0) {
      showToast(`${selectedMonthLabel}に未精算の支出はありません`, 'info');
      return;
    }

    if (confirm(`${selectedMonthLabel}の未精算支出（${unsettledCountInMonth}件）をすべて精算済みにしますか？`)) {
      const logData = {
        household_id: household.id,
        year_month: selectedYearMonth,
        settled_at: new Date().toISOString(),
        sender_name: settlementSummary.senderName || household.user2_name,
        receiver_name: settlementSummary.receiverName || household.user1_name,
        amount: settlementSummary.transferAmount,
        total_amount: settlementSummary.totalAmount,
        expense_count: unsettledCountInMonth,
      };

      if (isCloudSyncActive && isOnline) {
        try {
          await SupabaseService.settleMonth(household.id, selectedYearMonth);
          await SupabaseService.addSettlementLog(logData);
          expenses = await SupabaseService.getExpenses();
          settlementLogs = await SupabaseService.getSettlementLogs();
        } catch (e) {
          console.warn('Online settle failed, enqueuing', e);
          SyncQueueService.enqueue('settle_month', { householdId: household.id, yearMonth: selectedYearMonth });
          SyncQueueService.enqueue('add_settlement_log', logData);
          LocalStorageService.settleMonth(selectedYearMonth);
          LocalStorageService.addSettlementLog(logData);
          expenses = LocalStorageService.getExpenses();
          settlementLogs = LocalStorageService.getSettlementLogs();
        }
      } else {
        if (isCloudSyncActive) {
          SyncQueueService.enqueue('settle_month', { householdId: household.id, yearMonth: selectedYearMonth });
          SyncQueueService.enqueue('add_settlement_log', logData);
        }
        LocalStorageService.settleMonth(selectedYearMonth);
        LocalStorageService.addSettlementLog(logData);
        expenses = LocalStorageService.getExpenses();
        settlementLogs = LocalStorageService.getSettlementLogs();
      }
      renderApp();
      showToast(`${selectedMonthLabel}の精算を完了＆履歴に記録しました！✨`);
    }
  });

  // 9. 支出リスト表示切替（未精算のみ / すべて）
  const btnToggleShowAll = document.getElementById('btn-toggle-show-all');
  btnToggleShowAll?.addEventListener('click', () => {
    showAllExpenses = !showAllExpenses;
    renderApp();
  });

  // 10. 設定モーダル開閉
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

  // 11. 世帯設定フォーム保存
  const formSettings = document.getElementById('form-settings') as HTMLFormElement;
  formSettings?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r1 = parseInt(ratioSlider.value, 10);
    const r2 = 100 - r1;

    const prevUser1 = household.user1_name;
    const prevUser2 = household.user2_name;
    const newUser1 = user1Input.value.trim() || '夫';
    const newUser2 = user2Input.value.trim() || '妻';

    household = {
      ...household,
      user1_name: newUser1,
      user2_name: newUser2,
      ratio_user1: r1,
      ratio_user2: r2,
    };

    // 名前の変更があれば過去の支出履歴の立替者名も一括更新
    let renamed = false;
    if (prevUser1 !== newUser1) {
      if (isCloudSyncActive) {
        await SupabaseService.renamePayer(household.id, prevUser1, newUser1);
      } else {
        LocalStorageService.renamePayer(prevUser1, newUser1);
      }
      renamed = true;
    }

    if (prevUser2 !== newUser2) {
      if (isCloudSyncActive) {
        await SupabaseService.renamePayer(household.id, prevUser2, newUser2);
      } else {
        LocalStorageService.renamePayer(prevUser2, newUser2);
      }
      renamed = true;
    }

    if (isCloudSyncActive) {
      await SupabaseService.updateHousehold(household);
      expenses = await SupabaseService.getExpenses();
    } else {
      LocalStorageService.saveHousehold(household);
      expenses = LocalStorageService.getExpenses();
    }

    settingsModalOverlay?.classList.add('hidden');
    renderApp();
    if (renamed) {
      showToast('世帯設定と過去の支出履歴の名前を更新しました ⚙️');
    } else {
      showToast('世帯設定を保存しました ⚙️');
    }
  });


  // 12. 世帯招待コードのコピー
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

  // 13. 世帯参加（招待コード入力）
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

  // 14. Supabase設定保存フォーム
  const formSupabase = document.getElementById('form-supabase-config') as HTMLFormElement;
  formSupabase?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const urlInput = document.getElementById('supabase-url') as HTMLInputElement;
    const keyInput = document.getElementById('supabase-anon-key') as HTMLInputElement;

    const url = urlInput.value.trim().replace(/\/+$/, '');
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

  // 15. Supabase接続解除
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

  // 16. ローカルデータリセット
  const btnResetData = document.getElementById('btn-reset-data');
  btnResetData?.addEventListener('click', () => {
    if (confirm('ローカルデータをサンプル状態にリセットしますか？')) {
      LocalStorageService.resetAll();
      household = LocalStorageService.getHousehold();
      expenses = LocalStorageService.getExpenses();
      selectedYearMonth = getCurrentYearMonth();
      settingsModalOverlay?.classList.add('hidden');
      renderApp();
      showToast('サンプルデータに初期化しました');
    }
  });

  // 17. アプリ手動更新（PWAキャッシュ破棄＆最新版取得）
  const btnAppUpdate = document.getElementById('btn-app-update') as HTMLButtonElement | null;
  btnAppUpdate?.addEventListener('click', async () => {
    btnAppUpdate.disabled = true;
    btnAppUpdate.innerHTML = `
      <svg class="animate-spin h-3.5 w-3.5 text-[#52796f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>最新版を確認中...</span>
    `;

    showToast('最新版のアプリを確認・更新中...', 'info');

    try {
      // 1. Service Worker の更新チェック
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update().catch(() => {});
        }
      }

      // 2. CacheStorage の全キャッシュ破棄
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      showToast('最新版を再読み込みします', 'success');

      // トースト表示後にリロード（キャッシュバスターを付与）
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        window.location.replace(url.toString());
      }, 500);
    } catch (e) {
      console.error('App update failed', e);
      showToast('キャッシュ更新に失敗しました。再読込します', 'error');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  });

  // 18. 精算履歴モーダル開閉 & 削除
  const btnOpenHistory = document.getElementById('btn-open-settlement-history');
  const btnCloseHistory = document.getElementById('btn-close-settlement-history');
  const historyModalOverlay = document.getElementById('settlement-history-modal-overlay');

  btnOpenHistory?.addEventListener('click', () => {
    historyModalOverlay?.classList.remove('hidden');
  });

  btnCloseHistory?.addEventListener('click', () => {
    historyModalOverlay?.classList.add('hidden');
  });

  historyModalOverlay?.addEventListener('click', (e) => {
    if (e.target === historyModalOverlay) historyModalOverlay.classList.add('hidden');
  });

  document.querySelectorAll<HTMLButtonElement>('.btn-delete-log').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteLogId;
      if (!id) return;
      if (confirm('この精算履歴を削除しますか？')) {
        LocalStorageService.deleteSettlementLog(id);
        settlementLogs = settlementLogs.filter((l) => l.id !== id);
        renderApp();
        showToast('精算履歴を削除しました');
      }
    });
  });

  // 19. 固定費モーダル開閉 & 追加 & 削除 & 一括反映
  const btnOpenRecurring = document.getElementById('btn-open-recurring-modal');
  const btnCloseRecurring = document.getElementById('btn-close-recurring');
  const recurringModalOverlay = document.getElementById('recurring-modal-overlay');

  btnOpenRecurring?.addEventListener('click', () => {
    settingsModalOverlay?.classList.add('hidden');
    recurringModalOverlay?.classList.remove('hidden');
  });

  btnCloseRecurring?.addEventListener('click', () => {
    recurringModalOverlay?.classList.add('hidden');
  });

  recurringModalOverlay?.addEventListener('click', (e) => {
    if (e.target === recurringModalOverlay) recurringModalOverlay.classList.add('hidden');
  });

  // 固定費追加フォーム
  const formAddRecurring = document.getElementById('form-add-recurring') as HTMLFormElement;
  formAddRecurring?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('recurring-title') as HTMLInputElement;
    const amountInput = document.getElementById('recurring-amount') as HTMLInputElement;
    const catSelect = document.getElementById('recurring-category') as HTMLSelectElement;
    const payerSelect = document.getElementById('recurring-payer') as HTMLSelectElement;
    const splitSelect = document.getElementById('recurring-split') as HTMLSelectElement;

    const title = titleInput?.value.trim();
    const amount = parseInt(amountInput?.value || '0', 10);
    const category = (catSelect?.value as CategoryType) || 'utility';
    const paidBy = payerSelect?.value || household.user1_name;
    const splitType = (splitSelect?.value as SplitType) || 'ratio';

    if (!title || isNaN(amount) || amount <= 0) {
      showToast('正しい固定費の名称と金額を入力してください', 'error');
      return;
    }

    const newTemplate = {
      household_id: household.id,
      title,
      amount,
      category,
      paid_by_name: paidBy,
      split_type: splitType,
      day_of_month: 1,
    };

    if (isCloudSyncActive && isOnline) {
      try {
        const added = await SupabaseService.addRecurringTemplate(newTemplate);
        if (added) {
          recurringTemplates = await SupabaseService.getRecurringTemplates();
        } else {
          LocalStorageService.addRecurringTemplate(newTemplate);
          recurringTemplates = LocalStorageService.getRecurringTemplates();
        }
      } catch (err) {
        LocalStorageService.addRecurringTemplate(newTemplate);
        recurringTemplates = LocalStorageService.getRecurringTemplates();
      }
    } else {
      LocalStorageService.addRecurringTemplate(newTemplate);
      recurringTemplates = LocalStorageService.getRecurringTemplates();
    }

    renderApp();
    showToast(`固定費「${title}」を登録しました 📌`);
    document.getElementById('recurring-modal-overlay')?.classList.remove('hidden');
  });

  // 固定費削除ボタン
  document.querySelectorAll<HTMLButtonElement>('.btn-delete-recurring').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteRecurringId;
      if (!id) return;
      if (confirm('この固定費テンプレートを削除しますか？')) {
        if (isCloudSyncActive && isOnline) {
          await SupabaseService.deleteRecurringTemplate(id);
          recurringTemplates = await SupabaseService.getRecurringTemplates();
        }
        LocalStorageService.deleteRecurringTemplate(id);
        recurringTemplates = LocalStorageService.getRecurringTemplates();
        renderApp();
        showToast('固定費を削除しました');
        document.getElementById('recurring-modal-overlay')?.classList.remove('hidden');
      }
    });
  });

  // 今月への固定費一括反映
  const btnApplyRecurring = document.getElementById('btn-apply-recurring-to-month');
  btnApplyRecurring?.addEventListener('click', async () => {
    if (recurringTemplates.length === 0) return;

    const monthlyExps = filterExpensesByMonth(expenses, selectedYearMonth);
    const existingTitles = new Set(monthlyExps.map((e) => e.title));
    const toAdd = recurringTemplates.filter((t) => !existingTitles.has(t.title));

    if (toAdd.length === 0) {
      showToast(`${selectedYearMonth} にはすべての固定費が既に登録済みです`, 'info');
      return;
    }

    if (confirm(`${selectedYearMonth} の支出に未登録の固定費（${toAdd.length}件）を一括反映しますか？`)) {
      const defaultDate = `${selectedYearMonth}-01`;
      for (const t of toAdd) {
        const payload = {
          household_id: household.id,
          title: t.title,
          amount: t.amount,
          category: t.category,
          paid_by_name: t.paid_by_name,
          expense_date: defaultDate,
          is_settled: false,
          split_type: t.split_type,
        };

        if (isCloudSyncActive && isOnline) {
          try {
            await SupabaseService.addExpense(payload);
          } catch (e) {
            SyncQueueService.enqueue('create_expense', payload);
            LocalStorageService.addExpense(payload);
          }
        } else {
          if (isCloudSyncActive) {
            SyncQueueService.enqueue('create_expense', payload);
          }
          LocalStorageService.addExpense(payload);
        }
      }

      if (isCloudSyncActive && isOnline) {
        expenses = await SupabaseService.getExpenses();
      } else {
        expenses = LocalStorageService.getExpenses();
      }

      recurringModalOverlay?.classList.add('hidden');
      renderApp();
      showToast(`${selectedYearMonth} に固定費 ${toAdd.length}件 を反映しました！✨`);
    }
  });

  // 20. CSVデータ出力
  const btnExportCsvMonth = document.getElementById('btn-export-csv-month');
  btnExportCsvMonth?.addEventListener('click', () => {
    const monthlyExps = filterExpensesByMonth(expenses, selectedYearMonth);
    if (monthlyExps.length === 0) {
      showToast(`${selectedYearMonth} の支出データがありません`, 'error');
      return;
    }
    const filename = `pairpay_expenses_${selectedYearMonth}.csv`;
    downloadExpensesCsv(monthlyExps, household, filename);
    showToast(`${filename} をダウンロードしました 📥`);
  });

  const btnExportCsvAll = document.getElementById('btn-export-csv-all');
  btnExportCsvAll?.addEventListener('click', () => {
    if (expenses.length === 0) {
      showToast('支出データがありません', 'error');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `pairpay_expenses_all_${todayStr}.csv`;
    downloadExpensesCsv(expenses, household, filename);
    showToast(`${filename} をダウンロードしました 📥`);
  });
}

// オフライン同期キューの送信処理
async function flushSyncQueue() {
  if (!isCloudSyncActive || !isOnline) return;

  const count = SyncQueueService.getPendingCount();
  if (count === 0) return;

  const result = await SyncQueueService.processQueue(async (item) => {
    switch (item.action) {
      case 'create_expense':
        return !!(await SupabaseService.addExpense(item.payload));
      case 'update_expense':
        return await SupabaseService.updateExpense(item.payload);
      case 'delete_expense':
        return await SupabaseService.deleteExpense(item.payload.id);
      case 'settle_month':
        return await SupabaseService.settleMonth(item.payload.householdId, item.payload.yearMonth);
      case 'add_settlement_log':
        return !!(await SupabaseService.addSettlementLog(item.payload));
      case 'save_recurring':
        return !!(await SupabaseService.addRecurringTemplate(item.payload));
      case 'delete_recurring':
        return await SupabaseService.deleteRecurringTemplate(item.payload.id);
      default:
        return true;
    }
  });

  if (result.succeeded > 0) {
    expenses = await SupabaseService.getExpenses();
    settlementLogs = await SupabaseService.getSettlementLogs();
    showToast(`オフライン中の変更（${result.succeeded}件）をクラウド同期しました 🟢`);
  }
}

// オンライン・オフラインイベントリスナー
window.addEventListener('online', async () => {
  isOnline = true;
  showToast('オンラインに復帰しました 🌐', 'info');
  await flushSyncQueue();
  renderApp();
});

window.addEventListener('offline', () => {
  isOnline = false;
  showToast('オフラインモードで動作中です 📴', 'info');
  renderApp();
});

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await flushSyncQueue();
  renderApp();
});
