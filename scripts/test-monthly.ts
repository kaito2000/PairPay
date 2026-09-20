import {
  filterExpensesByMonth,
  groupExpensesByDate,
  shiftMonth,
  formatYearMonth,
  getAvailableMonths,
} from '../src/logic/settlement.ts';
import { Expense } from '../src/types.ts';

console.log('=== 月別ロジック・グルーピングの単体テスト開始 ===\n');

// 1. shiftMonth テスト
console.log('1. shiftMonth テスト');
const t1 = shiftMonth('2026-09', 1);
if (t1 !== '2026-10') throw new Error(`期待値: 2026-10, 実際: ${t1}`);

const t2 = shiftMonth('2026-12', 1);
if (t2 !== '2027-01') throw new Error(`年跨ぎ期待値: 2027-01, 実際: ${t2}`);

const t3 = shiftMonth('2026-01', -1);
if (t3 !== '2025-12') throw new Error(`前年跨ぎ期待値: 2025-12, 実際: ${t3}`);

const t4 = shiftMonth('2026-03', -5);
if (t4 !== '2025-10') throw new Error(`複数月前期待値: 2025-10, 実際: ${t4}`);
console.log('  shiftMonth: ALL PASSED ✅\n');

// 2. formatYearMonth テスト
console.log('2. formatYearMonth テスト');
const f1 = formatYearMonth('2026-09');
if (f1 !== '2026年9月') throw new Error(`フォーマット期待値: 2026年9月, 実際: ${f1}`);
const f2 = formatYearMonth('2025-12');
if (f2 !== '2025年12月') throw new Error(`フォーマット期待値: 2025年12月, 実際: ${f2}`);
console.log('  formatYearMonth: ALL PASSED ✅\n');

// モック支出データ (2026年8月, 2026年9月, 2026年10月)
const mockExpenses: Expense[] = [
  {
    id: 'e1',
    household_id: 'h1',
    title: '9月スーパー1',
    amount: 3000,
    category: 'food',
    paid_by_name: '夫',
    expense_date: '2026-09-18',
    is_settled: false,
    created_at: '',
  },
  {
    id: 'e2',
    household_id: 'h1',
    title: '9月スーパー2',
    amount: 2000,
    category: 'food',
    paid_by_name: '妻',
    expense_date: '2026-09-18',
    is_settled: false,
    created_at: '',
  },
  {
    id: 'e3',
    household_id: 'h1',
    title: '9月ドラッグストア',
    amount: 1500,
    category: 'daily',
    paid_by_name: '夫',
    expense_date: '2026-09-10',
    is_settled: true,
    created_at: '',
  },
  {
    id: 'e4',
    household_id: 'h1',
    title: '8月カフェ',
    amount: 1200,
    category: 'dining',
    paid_by_name: '妻',
    expense_date: '2026-08-25',
    is_settled: true,
    created_at: '',
  },
  {
    id: 'e5',
    household_id: 'h1',
    title: '10月映画',
    amount: 3800,
    category: 'special',
    paid_by_name: '夫',
    expense_date: '2026-10-01',
    is_settled: false,
    created_at: '',
  },
];

// 3. filterExpensesByMonth テスト
console.log('3. filterExpensesByMonth テスト');
const sepExpenses = filterExpensesByMonth(mockExpenses, '2026-09');
if (sepExpenses.length !== 3) {
  throw new Error(`9月の支出件数期待値: 3, 実際: ${sepExpenses.length}`);
}
const augExpenses = filterExpensesByMonth(mockExpenses, '2026-08');
if (augExpenses.length !== 1) {
  throw new Error(`8月の支出件数期待値: 1, 実際: ${augExpenses.length}`);
}
const emptyExpenses = filterExpensesByMonth(mockExpenses, '2026-07');
if (emptyExpenses.length !== 0) {
  throw new Error(`7月の支出件数期待値: 0, 実際: ${emptyExpenses.length}`);
}
console.log('  filterExpensesByMonth: ALL PASSED ✅\n');

// 4. groupExpensesByDate テスト
console.log('4. groupExpensesByDate テスト');
const groups = groupExpensesByDate(sepExpenses);
if (groups.length !== 2) {
  throw new Error(`9月の日付グループ数期待値: 2 (9/18, 9/10), 実際: ${groups.length}`);
}
// 降順ソート確認: 1つ目が9/18、2つ目が9/10
if (groups[0].date !== '2026-09-18' || groups[1].date !== '2026-09-10') {
  throw new Error(`日付ソート不正: ${groups[0].date}, ${groups[1].date}`);
}
// 9/18の日別小計確認: 3000 + 2000 = 5000
if (groups[0].totalAmount !== 5000) {
  throw new Error(`9/18の小計期待値: 5000, 実際: ${groups[0].totalAmount}`);
}
if (groups[0].expenses.length !== 2) {
  throw new Error(`9/18の件数期待値: 2, 実際: ${groups[0].expenses.length}`);
}
// 9/10の小計確認: 1500
if (groups[1].totalAmount !== 1500) {
  throw new Error(`9/10の小計期待値: 1500, 実際: ${groups[1].totalAmount}`);
}
console.log('  groupExpensesByDate: ALL PASSED ✅\n');

// 5. getAvailableMonths テスト
console.log('5. getAvailableMonths テスト');
const months = getAvailableMonths(mockExpenses, '2026-09');
// 降順: 2026-10, 2026-09, 2026-08
if (months.length !== 3) {
  throw new Error(`年月リスト件数期待値: 3, 実際: ${months.length}`);
}
if (months[0].yearMonth !== '2026-10' || months[1].yearMonth !== '2026-09' || months[2].yearMonth !== '2026-08') {
  throw new Error(`年月ソート不正: ${months.map((m) => m.yearMonth).join(', ')}`);
}
if (months[1].count !== 3) {
  throw new Error(`9月の件数集計期待値: 3, 実際: ${months[1].count}`);
}
console.log('  getAvailableMonths: ALL PASSED ✅\n');

console.log('🎉 ALL MONTHLY LOGIC TESTS COMPLETED SUCCESSFULLY! 🎉');
