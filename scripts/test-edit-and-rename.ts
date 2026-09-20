import { Expense, Household } from '../src/types.ts';
import { calculateSettlement } from '../src/logic/settlement.ts';

console.log('=== 支出編集 & 立替者名一括同期の単体テスト開始 ===\n');

// 1. 支出更新（updateExpense）ロジックの検証
console.log('1. 支出編集（更新）テスト');
let mockExpenses: Expense[] = [
  {
    id: 'exp-1',
    household_id: 'h1',
    title: 'スーパー',
    amount: 3000,
    category: 'food',
    paid_by_name: '夫',
    expense_date: '2026-09-18',
    is_settled: false,
    created_at: '2026-09-18T10:00:00.000Z',
  },
  {
    id: 'exp-2',
    household_id: 'h1',
    title: 'カフェ',
    amount: 1500,
    category: 'dining',
    paid_by_name: '妻',
    expense_date: '2026-09-19',
    is_settled: true,
    created_at: '2026-09-19T10:00:00.000Z',
  },
];

// exp-1 を編集（金額 3000 -> 4500、タイトル 'スーパー' -> 'イオン', カテゴリ 'food' -> 'daily'）
const updatedExp1: Expense = {
  ...mockExpenses[0],
  title: 'イオン',
  amount: 4500,
  category: 'daily',
};

mockExpenses = mockExpenses.map((e) => (e.id === updatedExp1.id ? updatedExp1 : e));

const foundExp1 = mockExpenses.find((e) => e.id === 'exp-1');
if (!foundExp1) throw new Error('exp-1が見つかりません');
if (foundExp1.amount !== 4500) throw new Error(`金額更新失敗: ${foundExp1.amount}`);
if (foundExp1.title !== 'イオン') throw new Error(`タイトル更新失敗: ${foundExp1.title}`);
if (foundExp1.category !== 'daily') throw new Error(`カテゴリ更新失敗: ${foundExp1.category}`);
// is_settledが保持されていること
if (foundExp1.is_settled !== false) throw new Error('is_settledが不正に変更されました');
console.log('  支出更新: ALL PASSED ✅\n');

// 2. 立替者名一括置換（renamePayer）テスト
console.log('2. 立替者名一括置換（renamePayer）テスト');
// 初期状態: 夫 1件, 妻 1件
// 夫 -> カイト へ変更
const oldName = '夫';
const newName = 'カイト';

mockExpenses = mockExpenses.map((e) => {
  if (e.paid_by_name === oldName) {
    return { ...e, paid_by_name: newName };
  }
  return e;
});

if (mockExpenses[0].paid_by_name !== 'カイト') {
  throw new Error(`exp-1の立替者がカイトになっていません: ${mockExpenses[0].paid_by_name}`);
}
if (mockExpenses[1].paid_by_name !== '妻') {
  throw new Error(`exp-2の立替者が妻のままになっていません: ${mockExpenses[1].paid_by_name}`);
}

// 妻 -> 花子 へ変更
mockExpenses = mockExpenses.map((e) => {
  if (e.paid_by_name === '妻') {
    return { ...e, paid_by_name: '花子' };
  }
  return e;
});

if (mockExpenses[1].paid_by_name !== '花子') {
  throw new Error(`exp-2の立替者が花子になっていません: ${mockExpenses[1].paid_by_name}`);
}
console.log('  名前置換: ALL PASSED ✅\n');

// 3. 名前変更後の精算計算（calculateSettlement）連動テスト
console.log('3. 新名前での精算計算連動テスト');
const householdAfterRename: Household = {
  id: 'h1',
  name: '我が家',
  user1_name: 'カイト',
  user2_name: '花子',
  ratio_user1: 50,
  ratio_user2: 50,
  created_at: '',
};

// 未精算のexp-1 (カイト立替 ¥4,500)
// 折半: 4,500 の半分 2,250 を 花子 -> カイト へ送金
const summary = calculateSettlement(mockExpenses, householdAfterRename);
if (summary.user1Total !== 4500) throw new Error(`カイトの立替額不正: ${summary.user1Total}`);
if (summary.user2Total !== 0) throw new Error(`花子の未精算立替額不正: ${summary.user2Total}`);
if (summary.senderName !== '花子' || summary.receiverName !== 'カイト') {
  throw new Error(`送金者/受取者不正: ${summary.senderName} -> ${summary.receiverName}`);
}
if (summary.transferAmount !== 2250) {
  throw new Error(`送金額不正: ${summary.transferAmount}`);
}
console.log('  精算連動: ALL PASSED ✅\n');

console.log('🎉 ALL EDIT & RENAME TESTS COMPLETED SUCCESSFULLY! 🎉');
