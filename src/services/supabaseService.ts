import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase.ts';
import { Expense, Household } from '../types.ts';

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

    // 1. households テーブルに作成
    const { data: householdData, error: hError } = await supabase
      .from('households')
      .insert({
        name,
        user1_name: user1Name,
        user2_name: user2Name,
        ratio_user1: 50,
        ratio_user2: 50,
      })
      .select()
      .single();

    if (hError || !householdData) {
      console.error('Failed to create household', hError);
      return null;
    }

    // 2. profiles テーブルに登録
    const { error: pError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        household_id: householdData.id,
        display_name: user1Name,
      });

    if (pError) {
      console.error('Failed to link profile to household', pError);
    }

    return householdData as Household;
  }

  /**
   * 招待コード（join_code）で既存の世帯に参加する
   */
  static async joinHouseholdByCode(code: string, displayName: string = '妻'): Promise<Household | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { userId } = await this.ensureAuth();
    if (!userId) return null;

    const normalizedCode = code.trim().toUpperCase();

    // 1. コードで世帯を検索
    const { data: householdData, error: hError } = await supabase
      .from('households')
      .select('*')
      .eq('join_code', normalizedCode)
      .maybeSingle();

    if (hError || !householdData) {
      console.error('Household not found with code', code, hError);
      return null;
    }

    // 2. ユーザーをこの世帯に紐付け
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

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        household_id: expenseData.household_id,
        title: expenseData.title,
        amount: expenseData.amount,
        category: expenseData.category,
        paid_by_name: expenseData.paid_by_name,
        expense_date: expenseData.expense_date,
        is_settled: false,
      })
      .select()
      .single();

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
}
