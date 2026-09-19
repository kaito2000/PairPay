import { calculateSettlement } from '../src/logic/settlement.ts';
import { Expense, Household } from '../src/types.ts';

const baseHousehold: Household = {
  id: 'h1',
  name: '我が家',
  user1_name: '夫',
  user2_name: '妻',
  ratio_user1: 50,
  ratio_user2: 50,
  created_at: '',
};

function createExpense(amount: number, paidBy: string): Expense {
  return {
    id: Math.random().toString(),
    household_id: 'h1',
    title: 'test',
    amount,
    category: 'food',
    paid_by_name: paidBy,
    expense_date: '2026-09-01',
    is_settled: false,
    created_at: '',
  };
}

console.log('=== 意地悪テスト 1: 奇数金額の端数ズレテスト ===');
for (const amount of [1, 3, 5, 7, 9, 11, 101, 3333]) {
  const ex = [createExpense(amount, '夫')];
  const res = calculateSettlement(ex, baseHousehold);
  const sumShouldPay = res.user1ShouldPay + res.user2ShouldPay;
  const isMatch = sumShouldPay === res.totalAmount;
  console.log(
    `総額: ¥${amount} -> 夫負担: ¥${res.user1ShouldPay}, 妻負担: ¥${res.user2ShouldPay} (合計: ¥${sumShouldPay}) -> ${
      isMatch ? 'PASS ✅' : 'FAIL ❌ (端数ズレ発生!)'
    }`
  );
  if (!isMatch) {
    console.error(`端数ズレが検出されました: 合計 ${amount} に対して負担合計が ${sumShouldPay}`);
  }
}

console.log('\n=== 意地悪テスト 2: 極端な比率 (0:100, 100:0, 1:99) ===');
for (const [r1, r2] of [[0, 100], [100, 0], [1, 99], [99, 1], [33, 67]]) {
  const h: Household = { ...baseHousehold, ratio_user1: r1, ratio_user2: r2 };
  const ex = [createExpense(10000, '夫')];
  const res = calculateSettlement(ex, h);
  const sumShouldPay = res.user1ShouldPay + res.user2ShouldPay;
  console.log(
    `比率 ${r1}:${r2} -> 夫負担: ¥${res.user1ShouldPay}, 妻負担: ¥${res.user2ShouldPay} (計: ¥${sumShouldPay}) 送金: ${res.senderName} -> ${res.receiverName} ¥${res.transferAmount}`
  );
}

console.log('\n=== 意地悪テスト 3: 空データ (未精算0件) ===');
const emptyRes = calculateSettlement([], baseHousehold);
console.log('0件の場合の送金額:', emptyRes.transferAmount, 'ステータス:', emptyRes.statusText);

console.log('\n=== 意地悪テスト 4: 極大金額 (1兆円) ===');
const hugeEx = [createExpense(1000000000000, '夫')];
const hugeRes = calculateSettlement(hugeEx, baseHousehold);
console.log('1兆円支出時の送金額:', hugeRes.transferAmount.toLocaleString());
