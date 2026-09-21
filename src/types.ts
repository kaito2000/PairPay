export type CategoryType = 'food' | 'daily' | 'utility' | 'dining' | 'special' | 'other';

export interface CategoryInfo {
  id: CategoryType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: Record<CategoryType, CategoryInfo> = {
  food: { id: 'food', label: '食費', icon: 'utensils', color: '#588157', bgColor: 'bg-[#edf4ee] text-[#426b42] border-[#c8decb]' },
  daily: { id: 'daily', label: '日用品', icon: 'shopping-bag', color: '#4a7c82', bgColor: 'bg-[#edf5f6] text-[#346267] border-[#c8e0e3]' },
  utility: { id: 'utility', label: '光熱費', icon: 'zap', color: '#cb8634', bgColor: 'bg-[#faf3e8] text-[#9c631e] border-[#edd8ba]' },
  dining: { id: 'dining', label: '外食', icon: 'coffee', color: '#c26d7f', bgColor: 'bg-[#faedf0] text-[#9c4c5e] border-[#f0cdd5]' },
  special: { id: 'special', label: '特別費', icon: 'sparkles', color: '#8a7090', bgColor: 'bg-[#f4eff5] text-[#69506e] border-[#dccee0]' },
  other: { id: 'other', label: 'その他', icon: 'more-horizontal', color: '#737a74', bgColor: 'bg-[#f2f4f2] text-[#4f5550] border-[#d4d9d4]' },
};

export type SplitType = 'ratio' | 'equal' | 'user1_full' | 'user2_full';

export interface Expense {
  id: string;
  household_id: string;
  title: string;
  amount: number;
  category: CategoryType;
  paid_by_name: string; // '夫' または '妻'
  expense_date: string; // 'YYYY-MM-DD'
  is_settled: boolean;
  split_type?: SplitType; // デフォルト: 'ratio'
  created_at: string;
}

export interface SettlementLog {
  id: string;
  household_id: string;
  year_month: string; // '2026-09'
  settled_at: string; // ISO 8601
  sender_name: string; // 送金者
  receiver_name: string; // 受取者
  amount: number; // 精算送金額
  total_amount: number; // 対象月の総支出額
  expense_count: number; // 対象支出件数
  created_at?: string;
}

export interface RecurringTemplate {
  id: string;
  household_id?: string;
  title: string;
  amount: number;
  category: CategoryType;
  paid_by_name: string;
  split_type: SplitType;
  day_of_month: number; // 毎月の目安日 (1〜28)
  created_at?: string;
}

export type SyncQueueAction =
  | 'create_expense'
  | 'update_expense'
  | 'delete_expense'
  | 'settle_month'
  | 'add_settlement_log'
  | 'save_recurring'
  | 'delete_recurring';

export interface SyncQueueItem {
  id: string;
  action: SyncQueueAction;
  payload: any;
  timestamp: number;
}

export interface Household {
  id: string;
  name: string;
  join_code?: string; // 6桁の招待コード
  user1_name: string; // デフォルト: '夫'
  user2_name: string; // デフォルト: '妻'
  ratio_user1: number; // 夫の負担割合 (0〜100, デフォルト: 50)
  ratio_user2: number; // 妻の負担割合 (0〜100, デフォルト: 50)
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}


export interface SettlementSummary {
  totalAmount: number;
  user1Total: number;
  user2Total: number;
  user1ShouldPay: number;
  user2ShouldPay: number;
  senderName: string | null; // 送金する人
  receiverName: string | null; // 受け取る人
  transferAmount: number; // 送金額 (0なら精算不要)
  statusText: string;
}

export interface DailyExpenseGroup {
  date: string; // 'YYYY-MM-DD'
  displayDate: string; // '9月18日 (金)'
  totalAmount: number;
  expenses: Expense[];
}

export interface MonthOption {
  yearMonth: string; // '2026-09'
  label: string; // '2026年9月'
  count: number;
}

