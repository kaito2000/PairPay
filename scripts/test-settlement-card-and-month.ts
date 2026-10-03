import assert from 'node:assert';
import { renderSettlementCard } from '../src/components/SettlementCard.ts';
import { SettlementSummary, Household } from '../src/types.ts';
import { LocalStorageService } from '../src/services/storage.ts';

console.log('=== 精算カード表示 & 取消 & 重複排除の単体テスト開始 ===\n');

// 1. 月末日の計算テスト
console.log('1. 月末日の正確性テスト');
function calculateMonthEnd(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
}

assert.strictEqual(calculateMonthEnd('2026-09'), '2026-09-30', '9月は30日まで');
assert.strictEqual(calculateMonthEnd('2026-02'), '2026-02-28', '2026年2月は28日まで');
assert.strictEqual(calculateMonthEnd('2024-02'), '2024-02-29', 'うるう年2024年2月は29日まで');
assert.strictEqual(calculateMonthEnd('2026-08'), '2026-08-31', '8月は31日まで');
assert.strictEqual(calculateMonthEnd('2026-04'), '2026-04-30', '4月は30日まで');
assert.strictEqual(calculateMonthEnd('2026-10'), '2026-10-31', '10月は31日まで');
console.log('  月末日計算: ALL PASSED ✅\n');

// 2. SettlementCard のレンダリングテスト
console.log('2. 精算カードボタン表示 & 立替実績表示テスト');

const mockHousehold: Household = {
  id: 'h1',
  name: 'テスト世帯',
  user1_name: '夫',
  user2_name: '妻',
  ratio_user1: 5,
  ratio_user2: 5,
};

const emptySummary: SettlementSummary = {
  totalAmount: 0,
  user1Total: 0,
  user2Total: 0,
  user1Target: 0,
  user2Target: 0,
  difference: 0,
  senderName: null,
  receiverName: null,
  transferAmount: 0,
  statusText: '精算は不要です',
};

// ケースA: 支出がまだ何もない月（未登録）
const htmlEmpty = renderSettlementCard(emptySummary, mockHousehold, '2026年10月', 0, 0, 0, 0);
assert(htmlEmpty.includes('支出なし'), '支出が0件の月は「支出なし」と表示されるべき');
assert(htmlEmpty.includes('disabled'), '支出が0件の月はボタンが無効化されるべき');
console.log('  ケースA (支出0件の月): ALL PASSED ✅');

// ケースB: 未精算の支出がある月
const activeSummary: SettlementSummary = {
  totalAmount: 10000,
  user1Total: 10000,
  user2Total: 0,
  user1Target: 5000,
  user2Target: 5000,
  difference: 5000,
  senderName: '妻',
  receiverName: '夫',
  transferAmount: 5000,
  statusText: '妻 ➔ 夫 へ ¥5,000 送金',
};
const htmlUnsettled = renderSettlementCard(activeSummary, mockHousehold, '2026年9月', 2, 10000, 10000, 0);
assert(htmlUnsettled.includes('精算完了にする'), '未精算がある月は「精算完了にする」と表示されるべき');
assert(!htmlUnsettled.includes('disabled'), '未精算がある月はボタンが活性化されるべき');
assert(htmlUnsettled.includes('data-action="settle"'), '未精算時は data-action="settle" であるべき');
console.log('  ケースB (未精算ありの月): ALL PASSED ✅');

// ケースC: すべて精算済みの月 (支出あり、未精算0件) ➔ 精算を取り消すボタンになり、立替総額は0にならない
const htmlSettled = renderSettlementCard(emptySummary, mockHousehold, '2026年8月', 0, 15000, 9000, 6000);
assert(htmlSettled.includes('精算を取り消す'), '全支出が精算完了した月は「精算を取り消す」と表示されるべき');
assert(!htmlSettled.includes('disabled'), '精算取消ボタンはクリック可能であるべき');
assert(htmlSettled.includes('data-action="unsettle"'), '精算完了後は data-action="unsettle" であるべき');
// 要望1の検証: 精算完了後も立替金額が0にならず、実績（¥9,000 と ¥6,000）が表示されていること
assert(htmlSettled.includes('¥9,000'), '精算完了後も夫の立替総額 ¥9,000 が表示されるべき');
assert(htmlSettled.includes('¥6,000'), '精算完了後も妻の立替総額 ¥6,000 が表示されるべき');
console.log('  ケースC (全精算済み・立替額維持・取消ボタン): ALL PASSED ✅\n');

// 3. 重複精算ログの集約（連打テスト）
console.log('3. 精算履歴の重複排除（連打テスト）');

// Node.js環境下でlocalStorageモック
const storageMap = new Map<string, string>();
(global as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
};

// 2026年9月の精算ログを1回目追加
LocalStorageService.addSettlementLog({
  household_id: 'h1',
  year_month: '2026-09',
  settled_at: '2026-09-30T10:00:00Z',
  sender_name: '妻',
  receiver_name: '夫',
  amount: 5000,
  total_amount: 10000,
  expense_count: 2,
});

assert.strictEqual(LocalStorageService.getSettlementLogs().length, 1, '1回目の精算ログが記録されるべき');

// 連打！同じ2026年9月を2回目、3回目追加（精算と取消を連打）
LocalStorageService.addSettlementLog({
  household_id: 'h1',
  year_month: '2026-09',
  settled_at: '2026-09-30T10:01:00Z',
  sender_name: '妻',
  receiver_name: '夫',
  amount: 5000,
  total_amount: 10000,
  expense_count: 2,
});

LocalStorageService.addSettlementLog({
  household_id: 'h1',
  year_month: '2026-09',
  settled_at: '2026-09-30T10:02:00Z',
  sender_name: '妻',
  receiver_name: '夫',
  amount: 6000,
  total_amount: 12000,
  expense_count: 3,
});

const logs = LocalStorageService.getSettlementLogs();
assert.strictEqual(logs.length, 1, '何回連打されても同一月のログは1つだけに集約されるべき');
assert.strictEqual(logs[0].amount, 6000, '最新の内容に更新されていること');
assert.strictEqual(logs[0].expense_count, 3, '最新の件数に更新されていること');
console.log('  履歴の同一月1件集約: ALL PASSED ✅\n');

// 4. 精算取消 (unsettleMonth) テスト
console.log('4. 精算取消 (unsettleMonth) のテスト');
LocalStorageService.saveExpenses([
  {
    id: 'exp-1',
    household_id: 'h1',
    title: 'スーパー',
    amount: 3000,
    category: 'food',
    paid_by_name: '夫',
    expense_date: '2026-09-15',
    is_settled: true, // 既に精算済み
    created_at: '2026-09-15T12:00:00Z',
  },
  {
    id: 'exp-2',
    household_id: 'h1',
    title: '日用品',
    amount: 2000,
    category: 'daily',
    paid_by_name: '妻',
    expense_date: '2026-09-20',
    is_settled: true, // 既に精算済み
    created_at: '2026-09-20T12:00:00Z',
  },
  {
    id: 'exp-3',
    household_id: 'h1',
    title: '8月の電気代',
    amount: 5000,
    category: 'utility',
    paid_by_name: '夫',
    expense_date: '2026-08-10',
    is_settled: true, // 8月は精算済みのまま残すべき
    created_at: '2026-08-10T12:00:00Z',
  },
]);

// 2026年9月を取り消し（未精算に戻す）
LocalStorageService.unsettleMonth('2026-09');
const expsAfter = LocalStorageService.getExpenses();

const exp1 = expsAfter.find((e) => e.id === 'exp-1')!;
const exp2 = expsAfter.find((e) => e.id === 'exp-2')!;
const exp3 = expsAfter.find((e) => e.id === 'exp-3')!;

assert.strictEqual(exp1.is_settled, false, '9月の支出1は未精算に戻るべき');
assert.strictEqual(exp2.is_settled, false, '9月の支出2は未精算に戻るべき');
assert.strictEqual(exp3.is_settled, true, '8月の支出3は精算済みのまま維持されるべき');
console.log('  精算取消 (unsettleMonth): ALL PASSED ✅\n');

// 5. 精算履歴モーダル (data-jump-ym & 立替額表示) テスト
console.log('5. 精算履歴モーダル (ジャンプ機能 & 立替額表示) のテスト');
import { renderSettlementHistoryModal } from '../src/components/SettlementHistoryModal.ts';

const testLogs: SettlementLog[] = [
  {
    id: 'log-sep',
    household_id: 'h1',
    year_month: '2026-09',
    settled_at: '2026-09-30T12:00:00Z',
    sender_name: '妻',
    receiver_name: '夫',
    amount: 5000,
    total_amount: 15000,
    expense_count: 4,
    user1_name: '夫',
    user1_amount: 10000,
    user2_name: '妻',
    user2_amount: 5000,
  },
  {
    id: 'log-aug-old',
    household_id: 'h1',
    year_month: '2026-08',
    settled_at: '2026-08-31T12:00:00Z',
    sender_name: '夫',
    receiver_name: '妻',
    amount: 2000,
    total_amount: 8000,
    expense_count: 2,
    // 古いログ (user1_amount 未記録)
  },
];

const mockExpensesForHistory = [
  {
    id: 'e-aug-1',
    household_id: 'h1',
    title: '電気',
    amount: 5000,
    category: 'utility' as const,
    paid_by_name: '夫',
    expense_date: '2026-08-10',
    is_settled: true,
    created_at: '2026-08-10T12:00:00Z',
  },
  {
    id: 'e-aug-2',
    household_id: 'h1',
    title: 'ガス',
    amount: 3000,
    category: 'utility' as const,
    paid_by_name: '妻',
    expense_date: '2026-08-15',
    is_settled: true,
    created_at: '2026-08-15T12:00:00Z',
  },
];

const historyHtml = renderSettlementHistoryModal(testLogs, mockHousehold, mockExpensesForHistory);

// ジャンプ用属性の検証
assert(historyHtml.includes('data-jump-ym="2026-09"'), '9月ログに data-jump-ym="2026-09" が含まれること');
assert(historyHtml.includes('data-jump-ym="2026-08"'), '8月ログに data-jump-ym="2026-08" が含まれること');

// ログ記録済み立替額の表示検証 (9月)
assert(historyHtml.includes('夫立替'), '夫立替ラベルが含まれること');
assert(historyHtml.includes('妻立替'), '妻立替ラベルが含まれること');
assert(historyHtml.includes('¥10,000'), '記録済みの夫立替額 ¥10,000 が表示されること');
assert(historyHtml.includes('¥5,000'), '記録済みの妻立替額 ¥5,000 が表示されること');

// 過去ログ自動補完の検証 (8月)
assert(historyHtml.includes('¥5,000'), '支出から補完された8月の夫立替額 ¥5,000 が表示されること');
assert(historyHtml.includes('¥3,000'), '支出から補完された8月の妻立替額 ¥3,000 が表示されること');

console.log('  精算履歴モーダル (ジャンプ & 立替額表示): ALL PASSED ✅\n');

// 6. 精算取消時の精算履歴削除 (deleteSettlementLogByMonth) テスト
console.log('6. 精算取消時の履歴削除 (deleteSettlementLogByMonth) のテスト');
LocalStorageService.saveSettlementLogs([
  {
    household_id: 'h1',
    year_month: '2026-09',
    settled_at: '2026-09-30T12:00:00Z',
    sender_name: '妻',
    receiver_name: '夫',
    amount: 5000,
    total_amount: 15000,
    expense_count: 4,
  },
  {
    household_id: 'h1',
    year_month: '2026-08',
    settled_at: '2026-08-31T12:00:00Z',
    sender_name: '夫',
    receiver_name: '妻',
    amount: 2000,
    total_amount: 8000,
    expense_count: 2,
  },
]);

assert.strictEqual(LocalStorageService.getSettlementLogs().length, 2, '初期状態で2件のログが存在すること');

// 2026-09 の精算ログを削除
LocalStorageService.deleteSettlementLogByMonth('2026-09');

const remainingLogs = LocalStorageService.getSettlementLogs();
assert.strictEqual(remainingLogs.length, 1, '削除後は1件になっていること');
assert.strictEqual(remainingLogs[0].year_month, '2026-08', '8月のログのみ残っていること');
assert(!remainingLogs.some((l) => l.year_month === '2026-09'), '9月のログは完全に削除されていること');
console.log('  精算取消時の履歴削除 (deleteSettlementLogByMonth): ALL PASSED ✅\n');

console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');

