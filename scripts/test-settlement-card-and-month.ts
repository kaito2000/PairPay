import assert from 'node:assert';
import { renderSettlementCard } from '../src/components/SettlementCard.ts';
import { SettlementSummary, Household } from '../src/types.ts';

console.log('=== 精算カード表示 & 月末計算の単体テスト開始 ===\n');

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
console.log('2. 精算カードボタン表示テスト');

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
const htmlEmpty = renderSettlementCard(emptySummary, mockHousehold, '2026年10月', 0, 0);
assert(htmlEmpty.includes('支出なし'), '支出が0件の月は「支出なし」と表示されるべき');
assert(!htmlEmpty.includes('>精算済み<'), '支出が0件の月は「精算済み」と表示されてはならない');
assert(htmlEmpty.includes('disabled'), '支出が0件の月はボタンが無効化されるべき');
console.log('  支出0件の月: ALL PASSED ✅');

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
const htmlUnsettled = renderSettlementCard(activeSummary, mockHousehold, '2026年9月', 2, 10000);
assert(htmlUnsettled.includes('精算完了にする'), '未精算がある月は「精算完了にする」と表示されるべき');
assert(!htmlUnsettled.includes('disabled'), '未精算がある月はボタンが活性化されるべき');
console.log('  未精算ありの月: ALL PASSED ✅');

// ケースC: すべて精算済みの月 (支出あり、未精算0件)
const htmlSettled = renderSettlementCard(emptySummary, mockHousehold, '2026年8月', 0, 15000);
assert(htmlSettled.includes('精算済み'), '全支出が精算完了した月は「精算済み」と表示されるべき');
assert(htmlSettled.includes('disabled'), '全支出が精算完了した月はボタンが無効化されるべき');
console.log('  全精算済みの月: ALL PASSED ✅\n');

console.log('🎉 ALL SETTLEMENT CARD & MONTH TESTS COMPLETED SUCCESSFULLY! 🎉');
