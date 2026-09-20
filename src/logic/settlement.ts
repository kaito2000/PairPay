import { Expense, Household, SettlementSummary } from '../types.ts';

/**
 * 未精算の支出リストと世帯の負担割合から精算サマリーを計算する純粋関数
 */
export function calculateSettlement(expenses: Expense[], household: Household): SettlementSummary {
  // 未精算の支出のみを対象とする
  const unsettledExpenses = expenses.filter((e) => !e.is_settled);

  const totalAmount = unsettledExpenses.reduce((sum, e) => sum + e.amount, 0);

  const user1Total = unsettledExpenses
    .filter((e) => e.paid_by_name === household.user1_name)
    .reduce((sum, e) => sum + e.amount, 0);

  const user2Total = unsettledExpenses
    .filter((e) => e.paid_by_name === household.user2_name)
    .reduce((sum, e) => sum + e.amount, 0);

  // 負担比率 (0.0 〜 1.0)
  const ratio1 = household.ratio_user1 / 100;

  // 1円単位の端数ズレを防ぐため、片方を四捨五入し、もう片方は差分で算出
  const user1ShouldPay = Math.round(totalAmount * ratio1);
  const user2ShouldPay = totalAmount - user1ShouldPay;

  // 夫（user1）の立替差額 = 実際に払った額 - 負担すべき額
  const deltaUser1 = user1Total - user1ShouldPay;

  let senderName: string | null = null;
  let receiverName: string | null = null;
  let transferAmount = 0;
  let statusText = '精算は不要です';

  if (deltaUser1 > 0) {
    // 夫が多く払っている -> 妻から夫へ送金
    senderName = household.user2_name;
    receiverName = household.user1_name;
    transferAmount = deltaUser1;
    statusText = `${senderName} ➔ ${receiverName} へ 【¥${transferAmount.toLocaleString()}】 送金`;
  } else if (deltaUser1 < 0) {
    // 妻が多く払っている -> 夫から妻へ送金
    senderName = household.user1_name;
    receiverName = household.user2_name;
    transferAmount = Math.abs(deltaUser1);
    statusText = `${senderName} ➔ ${receiverName} へ 【¥${transferAmount.toLocaleString()}】 送金`;
  }

  return {
    totalAmount,
    user1Total,
    user2Total,
    user1ShouldPay,
    user2ShouldPay,
    senderName,
    receiverName,
    transferAmount,
    statusText,
  };
}

/**
 * LINE共有用の精算メッセージ文面を生成する
 */
export function generateLineSettlementText(
  summary: SettlementSummary,
  household: Household,
  currentMonthText: string
): string {
  if (summary.transferAmount === 0) {
    return `【PairPay 精算報告 - ${currentMonthText}】\n現在、お互いの立替額は精算不要（差額0円）です！🎉\n総支出: ¥${summary.totalAmount.toLocaleString()}`;
  }

  const ratioText = `${household.ratio_user1}:${household.ratio_user2}`;
  return [
    `【PairPay 今月の精算報告 (${currentMonthText})】`,
    `--------------------------`,
    `■ 総支出: ¥${summary.totalAmount.toLocaleString()} (負担比率 ${ratioText})`,
    `・${household.user1_name}の立替: ¥${summary.user1Total.toLocaleString()}`,
    `・${household.user2_name}の立替: ¥${summary.user2Total.toLocaleString()}`,
    `--------------------------`,
    `👉 ${summary.senderName} から ${summary.receiverName} へ`,
    `【 ¥${summary.transferAmount.toLocaleString()} 】の送金をお願いします！`,
    `--------------------------`,
    `確認したら精算完了ボタンを押してね📱`,
  ].join('\n');
}

/**
 * 現在の年月文字列を取得 (例: "2026-09")
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 年月文字列を表示用日本語に変換 (例: "2026-09" -> "2026年9月")
 */
export function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  return `${parseInt(y, 10)}年${parseInt(m, 10)}月`;
}

/**
 * 年月を安全に加減算する純粋関数 (月末バグ防止)
 * @param yearMonth "YYYY-MM"
 * @param delta +1 で翌月, -1 で前月
 */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [yStr, mStr] = yearMonth.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10) + delta;

  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * 指定された年月の支出のみを抽出
 */
export function filterExpensesByMonth(expenses: Expense[], yearMonth: string): Expense[] {
  return expenses.filter((e) => e.expense_date.startsWith(yearMonth));
}

/**
 * 支出リストを日付ごとにグループ化し、日付降順で返却
 */
export function groupExpensesByDate(expenses: Expense[]): {
  date: string;
  displayDate: string;
  totalAmount: number;
  expenses: Expense[];
}[] {
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const groupsMap = new Map<string, Expense[]>();

  for (const exp of expenses) {
    const list = groupsMap.get(exp.expense_date) || [];
    list.push(exp);
    groupsMap.set(exp.expense_date, list);
  }

  // 日付の降順でソート
  const sortedDates = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((date) => {
    const list = groupsMap.get(date)!;
    const totalAmount = list.reduce((sum, e) => sum + e.amount, 0);

    // 日付フォーマット: 2026-09-18 -> "9月18日 (金)"
    const dateObj = new Date(`${date}T00:00:00`);
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const dayOfWeek = isNaN(dateObj.getTime()) ? '' : ` (${dayNames[dateObj.getDay()]})`;
    const displayDate = `${m}月${d}日${dayOfWeek}`;

    return {
      date,
      displayDate,
      totalAmount,
      expenses: list,
    };
  });
}

/**
 * 登録されている支出から利用可能な年月リストを取得（現在月および選択中の月を必ず含む、降順）
 */
export function getAvailableMonths(
  expenses: Expense[],
  currentYearMonth: string,
  selectedYearMonth?: string
): { yearMonth: string; label: string; count: number }[] {
  const countMap = new Map<string, number>();

  // 現在月をデフォルト登録
  countMap.set(currentYearMonth, 0);

  // 選択中の月も必ず登録（支出0件の月でもプルダウンで表示・同期可能にする）
  if (selectedYearMonth) {
    countMap.set(selectedYearMonth, 0);
  }

  for (const exp of expenses) {
    if (exp.expense_date && exp.expense_date.length >= 7) {
      const ym = exp.expense_date.substring(0, 7);
      countMap.set(ym, (countMap.get(ym) || 0) + 1);
    }
  }

  const sortedYm = Array.from(countMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedYm.map((ym) => ({
    yearMonth: ym,
    label: formatYearMonth(ym),
    count: countMap.get(ym) || 0,
  }));
}


