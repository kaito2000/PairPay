import { calculateSettlement, generateLineSettlementText } from '../src/logic/settlement.ts';
import { Expense, Household } from '../src/types.ts';

const mockHousehold: Household = {
  id: 'h1',
  name: '我が家',
  user1_name: '夫',
  user2_name: '妻',
  ratio_user1: 50,
  ratio_user2: 50,
  created_at: '',
};

// 設計書6章のテストケース:
// 夫の立替: ¥62,000, 妻の立替: ¥38,000, 総支出: ¥100,000
// 50:50折半 -> 妻 -> 夫 へ ¥12,000 送金
const mockExpenses: Expense[] = [
  {
    id: '1',
    household_id: 'h1',
    title: '家電',
    amount: 62000,
    category: 'special',
    paid_by_name: '夫',
    expense_date: '2026-09-01',
    is_settled: false,
    created_at: '',
  },
  {
    id: '2',
    household_id: 'h1',
    title: 'スーパーなど',
    amount: 38000,
    category: 'food',
    paid_by_name: '妻',
    expense_date: '2026-09-02',
    is_settled: false,
    created_at: '',
  },
];

const result = calculateSettlement(mockExpenses, mockHousehold);
console.log('--- 折半 (50:50) テスト ---');
console.log('総支出:', result.totalAmount);
console.log('夫立替:', result.user1Total);
console.log('妻立替:', result.user2Total);
console.log('送金者:', result.senderName);
console.log('受取者:', result.receiverName);
console.log('送金額:', result.transferAmount);
console.log('ステータステキスト:', result.statusText);

if (result.transferAmount !== 12000 || result.senderName !== '妻' || result.receiverName !== '夫') {
  console.error('FAIL: 期待値(妻->夫 ¥12,000)と不一致');
  process.exit(1);
}

// 傾斜配分テスト (夫60: 妻40)
// 総額100,000円
// 夫負担: 60,000円, 妻負担: 40,000円
// 夫立替: 62,000円 -> 2,000円余分に払っている
// 妻立替: 38,000円 -> 2,000円不足している
// 妻 -> 夫 へ ¥2,000 送金
const skewedHousehold: Household = {
  ...mockHousehold,
  ratio_user1: 60,
  ratio_user2: 40,
};
const resultSkewed = calculateSettlement(mockExpenses, skewedHousehold);
console.log('\n--- 傾斜 (60:40) テスト ---');
console.log('送金者:', resultSkewed.senderName);
console.log('受取者:', resultSkewed.receiverName);
console.log('送金額:', resultSkewed.transferAmount);

if (resultSkewed.transferAmount !== 2000 || resultSkewed.senderName !== '妻' || resultSkewed.receiverName !== '夫') {
  console.error('FAIL: 傾斜配分テスト不一致');
  process.exit(1);
}

// LINE文面テスト
const lineText = generateLineSettlementText(result, mockHousehold, '2026年9月');
console.log('\n--- LINE文面テスト ---');
console.log(lineText);

console.log('\nALL TESTS PASSED! ✅');
