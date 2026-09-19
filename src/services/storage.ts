import { Expense, Household } from '../types.ts';

const STORAGE_KEY_EXPENSES = 'pairpay_expenses_v1';
const STORAGE_KEY_HOUSEHOLD = 'pairpay_household_v1';

const DEFAULT_HOUSEHOLD: Household = {
  id: 'local-household-1',
  name: '我が家',
  user1_name: '夫',
  user2_name: '妻',
  ratio_user1: 50,
  ratio_user2: 50,
  created_at: new Date().toISOString(),
};

function getSampleExpenses(): Expense[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = today.getDate();

  const pad = (num: number) => String(num).padStart(2, '0');

  return [
    {
      id: 'sample-1',
      household_id: 'local-household-1',
      title: '週末スーパー買い出し',
      amount: 4850,
      category: 'food',
      paid_by_name: '夫',
      expense_date: `${y}-${m}-${pad(Math.max(1, d - 3))}`,
      is_settled: false,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'sample-2',
      household_id: 'local-household-1',
      title: 'ドラッグストア（洗剤・日用品）',
      amount: 2380,
      category: 'daily',
      paid_by_name: '妻',
      expense_date: `${y}-${m}-${pad(Math.max(1, d - 2))}`,
      is_settled: false,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'sample-3',
      household_id: 'local-household-1',
      title: '近所のお気に入りカフェ',
      amount: 3200,
      category: 'dining',
      paid_by_name: '夫',
      expense_date: `${y}-${m}-${pad(Math.max(1, d - 1))}`,
      is_settled: false,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ];
}

export class LocalStorageService {
  static getHousehold(): Household {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HOUSEHOLD);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load household from localStorage', e);
    }
    this.saveHousehold(DEFAULT_HOUSEHOLD);
    return DEFAULT_HOUSEHOLD;
  }

  static saveHousehold(household: Household): void {
    localStorage.setItem(STORAGE_KEY_HOUSEHOLD, JSON.stringify(household));
  }

  static getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_EXPENSES);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load expenses from localStorage', e);
    }
    // 初回はサンプルデータを投入
    const sample = getSampleExpenses();
    this.saveExpenses(sample);
    return sample;
  }

  static saveExpenses(expenses: Expense[]): void {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  }

  static addExpense(expenseData: Omit<Expense, 'id' | 'created_at'>): Expense {
    const expenses = this.getExpenses();
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    this.saveExpenses(expenses);
    return newExpense;
  }

  static deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter((e) => e.id !== id);
    this.saveExpenses(expenses);
  }

  static settleAll(): void {
    const expenses = this.getExpenses().map((e) => ({
      ...e,
      is_settled: true,
    }));
    this.saveExpenses(expenses);
  }

  static resetAll(): void {
    localStorage.removeItem(STORAGE_KEY_EXPENSES);
    localStorage.removeItem(STORAGE_KEY_HOUSEHOLD);
  }
}
