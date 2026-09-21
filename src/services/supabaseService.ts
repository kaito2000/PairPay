import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase.ts';
import { Expense, Household, RecurringTemplate, SettlementLog } from '../types.ts';

export class SupabaseService {
  private static realtimeChannel: RealtimeChannel | null = null;

  /**
   * 匿名認証でセキュアにサインイン (メール登録不要)
   */
  static async ensureAuth(): Promise<{ userId: string | null; errorMsg: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { userId: null, errorMsg: 'Supabaseクライアントの初期化に失敗しました' };

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      return { userId: sessionData.session.user.id, errorMsg: null };
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Anonymous sign-in failed', error);
      if (error.message.toLowerCase().includes('disabled') || error.message.toLowerCase().includes('anonymous')) {
        return {
          userId: null,
          errorMsg: 'Supabaseで匿名認証が無効です (Authentication > Providers > Anonymous sign-ins をONにしてください)',
        };
      }
      return { userId: null, errorMsg: `認証エラー: ${error.message}` };
    }
    return { userId: data.user?.id || null, errorMsg: null };
  }

  /**
   * 現在のユーザーが所属している世帯IDとプロファイルを取得
   */
  static async getCurrentProfile(): Promise<{ householdId: string | null; displayName: string } | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { userId } = await this.ensureAuth();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('household_id, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      householdId: data.household_id,
      displayName: data.display_name,
    };
  }

  /**
   * 新しい世帯を作成し、現在のユーザーをその世帯に紐付ける
   * セキュリティ強化RLS環境でも確実に成功するよう、プロファイル紐付けを確実に行う
   */
  static async createHousehold(
    name: string = '我が家',
    user1Name: string = '夫',
    user2Name: string = '妻'
  ): Promise<Household | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { userId } = await this.ensureAuth();
    if (!userId) return null;

    // 1. 安全なRPC関数があれば最優先で呼び出し (Security Definer)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_household_and_link_profile', {
        p_name: name,
        p_user1_name: user1Name,
        p_user2_name: user2Name,
      });

      if (!rpcError && rpcData) {
        return rpcData as Household;
      }
    } catch (e) {
      console.warn('RPC create_household_and_link_profile call failed, falling back', e);
    }

    // 2. フォールバック: UUID先行生成方式
    // (.insert().select() だと、まだ profiles に紐付いていないため RLS SELECT ポリシーで弾かれる問題を解決)
    const newHouseholdId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'h-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

    // 2-1. households テーブルに insert (.select() を呼ばずに実行)
    const { error: hError } = await supabase
      .from('households')
      .insert({
        id: newHouseholdId,
        name,
        user1_name: user1Name,
        user2_name: user2Name,
        ratio_user1: 50,
        ratio_user2: 50,
      });

    if (hError) {
      console.error('Failed to create household', hError);
      return null;
    }

    // 2-2. profiles テーブルに世帯IDを登録 (これで所属メンバーになる)
    const { error: pError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        household_id: newHouseholdId,
        display_name: user1Name,
      });

    if (pError) {
      console.error('Failed to link profile to household', pError);
    }

    // 2-3. profiles に紐付いたので、RLS SELECT ポリシーを満たして安全に取得
    const { data: householdData, error: fetchError } = await supabase
      .from('households')
      .select('*')
      .eq('id', newHouseholdId)
      .maybeSingle();

    if (fetchError || !householdData) {
      console.warn('Could not fetch newly created household, using constructed object', fetchError);
      return {
        id: newHouseholdId,
        name,
        user1_name: user1Name,
        user2_name: user2Name,
        ratio_user1: 50,
        ratio_user2: 50,
        created_at: new Date().toISOString(),
      };
    }

    return householdData as Household;
  }


  /**
   * 招待コード（join_code）で既存の世帯に参加する
   * セキュリティ強化: 全件ダンプを防ぐRPC関数 join_household_by_code を優先使用
   */
  static async joinHouseholdByCode(code: string, displayName: string = '妻'): Promise<Household | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { userId } = await this.ensureAuth();
    if (!userId) return null;

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;

    // 1. 安全なRPC関数を呼び出し (Security Definer)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('join_household_by_code', {
        p_code: normalizedCode,
        p_display_name: displayName,
      });

      if (!rpcError && rpcData) {
        return rpcData as Household;
      }
    } catch (e) {
      console.warn('RPC join_household_by_code call failed, falling back', e);
    }

    // 2. フォールバック (旧スキーマ環境用)
    const { data: householdData, error: hError } = await supabase
      .from('households')
      .select('*')
      .eq('join_code', normalizedCode)
      .maybeSingle();

    if (hError || !householdData) {
      console.error('Household not found with code', code, hError);
      return null;
    }

    const { error: pError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        household_id: householdData.id,
        display_name: displayName,
      });

    if (pError) {
      console.error('Failed to join household', pError);
      return null;
    }

    return householdData as Household;
  }


  /**
   * 世帯情報を取得
   */
  static async getHousehold(): Promise<Household | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const profile = await this.getCurrentProfile();
    if (!profile || !profile.householdId) return null;

    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('id', profile.householdId)
      .single();

    if (error) {
      console.error('Failed to fetch household', error);
      return null;
    }

    return data as Household;
  }

  /**
   * 世帯設定（負担比率やメンバー名）を更新
   */
  static async updateHousehold(household: Household): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('households')
      .update({
        name: household.name,
        user1_name: household.user1_name,
        user2_name: household.user2_name,
        ratio_user1: household.ratio_user1,
        ratio_user2: household.ratio_user2,
      })
      .eq('id', household.id);

    return !error;
  }

  /**
   * 支出リストを取得 (作成日時降順)
   */
  static async getExpenses(): Promise<Expense[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const profile = await this.getCurrentProfile();
    if (!profile || !profile.householdId) return [];

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', profile.householdId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch expenses', error);
      return [];
    }

    return (data || []) as Expense[];
  }

  /**
   * 支出を追加
   */
  static async addExpense(expenseData: Omit<Expense, 'id' | 'created_at'>): Promise<Expense | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const payload: any = {
      household_id: expenseData.household_id,
      title: expenseData.title,
      amount: expenseData.amount,
      category: expenseData.category,
      paid_by_name: expenseData.paid_by_name,
      expense_date: expenseData.expense_date,
      is_settled: false,
      split_type: expenseData.split_type || 'ratio',
    };

    let { data, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select()
      .single();

    // スキーマ未更新環境で split_type カラムが存在しない場合のフォールバック
    if (error && error.message.includes('split_type')) {
      console.warn('split_type column might not exist, retrying without split_type');
      delete payload.split_type;
      const retryResult = await supabase.from('expenses').insert(payload).select().single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error('Failed to add expense', error);
      return null;
    }

    return data as Expense;
  }

  /**
   * 支出を削除
   */
  static async deleteExpense(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    return !error;
  }

  /**
   * 支出を更新
   */
  static async updateExpense(expense: Expense): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const updatePayload: any = {
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      paid_by_name: expense.paid_by_name,
      expense_date: expense.expense_date,
      is_settled: expense.is_settled,
      split_type: expense.split_type || 'ratio',
    };

    let { error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', expense.id);

    if (error && error.message.includes('split_type')) {
      delete updatePayload.split_type;
      const retryResult = await supabase
        .from('expenses')
        .update(updatePayload)
        .eq('id', expense.id);
      error = retryResult.error;
    }

    if (error) {
      console.error('Failed to update expense', error);
      return false;
    }

    return true;
  }

  /**
   * 世帯内の支出の立替者名を一括置換
   */
  static async renamePayer(householdId: string, oldName: string, newName: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !oldName || !newName || oldName === newName) return false;

    const { error } = await supabase
      .from('expenses')
      .update({ paid_by_name: newName })
      .eq('household_id', householdId)
      .eq('paid_by_name', oldName);

    if (error) {
      console.error('Failed to rename payer in expenses', error);
      return false;
    }

    return true;
  }

  /**
   * 未精算の支出をすべて精算済みに更新

   */
  static async settleAll(householdId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('expenses')
      .update({ is_settled: true })
      .eq('household_id', householdId)
      .eq('is_settled', false);

    return !error;
  }

  /**
   * 特定の年月の未精算支出を精算済みに更新
   */
  static async settleMonth(householdId: string, yearMonth: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const startDate = `${yearMonth}-01`;
    const endDate = `${yearMonth}-31`;

    const { error } = await supabase
      .from('expenses')
      .update({ is_settled: true })
      .eq('household_id', householdId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .eq('is_settled', false);

    return !error;
  }


  /**
   * リアルタイム変更を購読 (Supabase Realtime)
   */
  static subscribeToChanges(onChanged: () => void): void {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = supabase
      .channel('pairpay-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          console.log('Realtime change detected on expenses table');
          onChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'households' },
        () => {
          console.log('Realtime change detected on households table');
          onChanged();
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime subscription status:', status);
      });
  }

  /**
   * 購読解除
   */
  static unsubscribe(): void {
    if (this.realtimeChannel) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.removeChannel(this.realtimeChannel);
      }
      this.realtimeChannel = null;
    }
  }

  // ==========================================
  // 精算履歴 (Settlement Logs)
  // ==========================================
  static async getSettlementLogs(): Promise<SettlementLog[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const profile = await this.getCurrentProfile();
    if (!profile || !profile.householdId) return [];

    try {
      const { data, error } = await supabase
        .from('settlement_logs')
        .select('*')
        .eq('household_id', profile.householdId)
        .order('settled_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch settlement logs from Supabase (table might not exist yet)', error);
        return [];
      }
      return (data || []) as SettlementLog[];
    } catch (e) {
      console.warn('Error fetching settlement logs', e);
      return [];
    }
  }

  static async addSettlementLog(
    logData: Omit<SettlementLog, 'id' | 'created_at'>
  ): Promise<SettlementLog | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('settlement_logs')
        .insert({
          household_id: logData.household_id,
          year_month: logData.year_month,
          settled_at: logData.settled_at,
          sender_name: logData.sender_name,
          receiver_name: logData.receiver_name,
          amount: logData.amount,
          total_amount: logData.total_amount,
          expense_count: logData.expense_count,
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to add settlement log to Supabase', error);
        return null;
      }
      return data as SettlementLog;
    } catch (e) {
      console.warn('Error adding settlement log to Supabase', e);
      return null;
    }
  }

  // ==========================================
  // 固定費テンプレート (Recurring Templates)
  // ==========================================
  static async getRecurringTemplates(): Promise<RecurringTemplate[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const profile = await this.getCurrentProfile();
    if (!profile || !profile.householdId) return [];

    try {
      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('household_id', profile.householdId)
        .order('day_of_month', { ascending: true });

      if (error) {
        console.warn('Failed to fetch recurring templates (table might not exist yet)', error);
        return [];
      }
      return (data || []) as RecurringTemplate[];
    } catch (e) {
      console.warn('Error fetching recurring templates', e);
      return [];
    }
  }

  static async addRecurringTemplate(
    template: Omit<RecurringTemplate, 'id' | 'created_at'>
  ): Promise<RecurringTemplate | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('recurring_templates')
        .insert({
          household_id: template.household_id,
          title: template.title,
          amount: template.amount,
          category: template.category,
          paid_by_name: template.paid_by_name,
          split_type: template.split_type || 'ratio',
          day_of_month: template.day_of_month || 1,
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to add recurring template', error);
        return null;
      }
      return data as RecurringTemplate;
    } catch (e) {
      console.warn('Error adding recurring template', e);
      return null;
    }
  }

  static async deleteRecurringTemplate(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('recurring_templates').delete().eq('id', id);
      return !error;
    } catch (e) {
      console.warn('Error deleting recurring template', e);
      return false;
    }
  }
}
