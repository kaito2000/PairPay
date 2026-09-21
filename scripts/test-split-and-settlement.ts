import { calculateSettlement } from '../src/logic/settlement.ts';
import { generateExpensesCsv } from '../src/utils/csv.ts';
import { Expense, Household } from '../src/types.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log('=== 個別負担・CSV・精算機能の単体テスト開始 ===\n');

const testHousehold: Household = {
  id: 'h-1',
  name: 'テスト世帯',
  user1_name: '太郎',
  user2_name: '花子',
  ratio_user1: 60,
  ratio_user2: 40,
  created_at: new Date().toISOString(),
};

// 1. 個別負担 (split_type) 精算テスト
console.log('1. 個別負担 (split_type) 計算テスト');

// ケースA: 全て基本比率 (60:40)
// 太郎が 10,000円立替。太郎負担 6,000円, 花子負担 4,000円 -> 花子から太郎へ 4,000円送金
const expensesA: Expense[] = [
  {
    id: 'e-1',
    household_id: 'h-1',
    title: '基本比率支出',
    amount: 10000,
    category: 'food',
    paid_by_name: '太郎',
    expense_date: '2026-09-01',
    is_settled: false,
    split_type: 'ratio',
    created_at: '',
  },
];
const resA = calculateSettlement(expensesA, testHousehold);
assert(resA.transferAmount === 4000, `ケースA 送金額が4000円であるべき: 実際は${resA.transferAmount}`);
assert(resA.senderName === '花子', `ケースA 送金者は花子であるべき`);
assert(resA.receiverName === '太郎', `ケースA 受取者は太郎であるべき`);

// ケースB: 太郎が花子の私物を立替 (user2_full: 花子が全額負担)
// 太郎が 5,000円立替。太郎負担 0円, 花子負担 5,000円 -> 花子から太郎へ 5,000円全額送金
const expensesB: Expense[] = [
  {
    id: 'e-2',
    household_id: 'h-1',
    title: '花子の服',
    amount: 5000,
    category: 'daily',
    paid_by_name: '太郎',
    expense_date: '2026-09-02',
    is_settled: false,
    split_type: 'user2_full',
    created_at: '',
  },
];
const resB = calculateSettlement(expensesB, testHousehold);
assert(resB.transferAmount === 5000, `ケースB 送金額が5000円であるべき: 実際は${resB.transferAmount}`);
assert(resB.senderName === '花子', `ケースB 送金者は花子`);
assert(resB.receiverName === '太郎', `ケースB 受取者は太郎`);

// ケースC: 太郎が自分の趣味の物を立替 (user1_full: 太郎が全額自己負担)
// 太郎が 8,000円立替。太郎負担 8,000円, 花子負担 0円 -> 送金0円（精算不要）
const expensesC: Expense[] = [
  {
    id: 'e-3',
    household_id: 'h-1',
    title: '太郎のゲーム',
    amount: 8000,
    category: 'special',
    paid_by_name: '太郎',
    expense_date: '2026-09-03',
    is_settled: false,
    split_type: 'user1_full',
    created_at: '',
  },
];
const resC = calculateSettlement(expensesC, testHousehold);
assert(resC.transferAmount === 0, `ケースC 送金額が0円であるべき: 実際は${resC.transferAmount}`);

// ケースD: 花子が太郎の物を立替 (user1_full: 太郎が全額負担)
// 花子が 3,000円立替。太郎負担 3,000円, 花子負担 0円 -> 太郎から花子へ 3,000円送金
const expensesD: Expense[] = [
  {
    id: 'e-4',
    household_id: 'h-1',
    title: '太郎の本',
    amount: 3000,
    category: 'special',
    paid_by_name: '花子',
    expense_date: '2026-09-04',
    is_settled: false,
    split_type: 'user1_full',
    created_at: '',
  },
];
const resD = calculateSettlement(expensesD, testHousehold);
assert(resD.transferAmount === 3000, `ケースD 送金額が3000円であるべき: 実際は${resD.transferAmount}`);
assert(resD.senderName === '太郎', `ケースD 送金者は太郎`);
assert(resD.receiverName === '花子', `ケースD 受取者は花子`);

// ケースE: 等分 (equal: 50:50) (世帯比率が60:40でもこの支出だけは半々)
// 花子が 4,000円立替。太郎負担 2,000円, 花子負担 2,000円 -> 太郎から花子へ 2,000円送金
const expensesE: Expense[] = [
  {
    id: 'e-5',
    household_id: 'h-1',
    title: '折半ディナー',
    amount: 4000,
    category: 'dining',
    paid_by_name: '花子',
    expense_date: '2026-09-05',
    is_settled: false,
    split_type: 'equal',
    created_at: '',
  },
];
const resE = calculateSettlement(expensesE, testHousehold);
assert(resE.transferAmount === 2000, `ケースE 送金額が2000円であるべき: 実際は${resE.transferAmount}`);
assert(resE.senderName === '太郎', `ケースE 送金者は太郎`);
assert(resE.receiverName === '花子', `ケースE 受取者は花子`);

// ケースF: 全てが混在した複合ケース
// e-1: 10,000円 (太郎立替, 60:40) -> 太郎6000, 花子4000
// e-2: 5,000円 (太郎立替, 花子全額) -> 太郎0, 花子5000
// e-4: 3,000円 (花子立替, 太郎全額) -> 太郎3000, 花子0
// e-5: 4,000円 (花子立替, 50:50) -> 太郎2000, 花子2000
// 総支出: 22,000円
// 太郎立替総額: 10000 + 5000 = 15,000円
// 花子立替総額: 3000 + 4000 = 7,000円
// 太郎負担総額: 6000 + 0 + 3000 + 2000 = 11,000円
// 花子負担総額: 4000 + 5000 + 0 + 2000 = 11,000円
// 太郎立替差額: 15,000 - 11,000 = +4,000円 -> 花子から太郎へ 4,000円送金
const mixedExpenses = [...expensesA, ...expensesB, ...expensesD, ...expensesE];
const resMixed = calculateSettlement(mixedExpenses, testHousehold);
assert(resMixed.totalAmount === 22000, `複合ケース 総額22000円`);
assert(resMixed.user1Total === 15000, `複合ケース 太郎立替15000円`);
assert(resMixed.user2Total === 7000, `複合ケース 花子立替7000円`);
assert(resMixed.user1ShouldPay === 11000, `複合ケース 太郎負担11000円`);
assert(resMixed.user2ShouldPay === 11000, `複合ケース 花子負担11000円`);
assert(resMixed.transferAmount === 4000, `複合ケース 送金4000円`);
assert(resMixed.senderName === '花子', `複合ケース 送金者花子`);
assert(resMixed.receiverName === '太郎', `複合ケース 受取者太郎`);

console.log('  個別負担計算: ALL PASSED ✅\n');

// 2. CSVエクスポート文字列テスト
console.log('2. CSVエクスポート文字列テスト');
const csv = generateExpensesCsv(mixedExpenses, testHousehold);

// UTF-8 BOM の存在確認 (\uFEFF)
assert(csv.startsWith('\uFEFF'), 'CSVはUTF-8 BOM (\uFEFF) で始まるべき');
assert(csv.includes('日付,タイトル/メモ,金額,カテゴリ,立替者,負担方法,精算状況,登録日時'), 'ヘッダー行が含まれるべき');
assert(csv.includes('花子の服'), '花子の服が含まれるべき');
assert(csv.includes('太郎が全額') || csv.includes('花子が全額'), '個別負担ラベルが含まれるべき');

console.log('  CSVエクスポート: ALL PASSED ✅\n');

console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
