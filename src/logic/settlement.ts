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
