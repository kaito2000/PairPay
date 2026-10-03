import assert from 'node:assert';
import { getQuickPresets } from '../src/logic/preset.ts';
import { renderBudgetCard } from '../src/components/BudgetCard.ts';
import { Expense, Household } from '../src/types.ts';

console.log('=== クイックプリセット & 月間予算機能 単体テスト開始 ===\n');

const mockHousehold: Household = {
  id: 'h1',
  name: 'テスト世帯',
  user1_name: '夫',
  user2_name: '妻',
  ratio_user1: 50,
  ratio_user2: 50,
  monthly_budget: 150000,
  created_at: new Date().toISOString(),
};

// 1. getQuickPresets テスト (空データ時)
console.log('1. getQuickPresets (空データ時のフォールバック)');
const emptyPresets = getQuickPresets([], mockHousehold);
assert.strictEqual(emptyPresets.length, 4, 'デフォルトで4つのプリセットが返されるべき');
assert(emptyPresets.some((p) => p.title === 'スーパー'), '「スーパー」が含まれるべき');
assert(emptyPresets.some((p) => p.title === 'ドラッグストア'), '「ドラッグストア」が含まれるべき');
console.log('  空データ時フォールバック: ALL PASSED ✅\n');

// 2. getQuickPresets テスト (支出履歴からの頻度抽出)
console.log('2. getQuickPresets (支出履歴からの集計・ランキング抽出)');
const sampleExpenses: Expense[] = [
  {
    id: 'e1',
    household_id: 'h1',
    title: 'スーパー買い出し',
    amount: 5200,
    category: 'food',
    paid_by_name: '夫',
    split_type: 'ratio',
    expense_date: '2026-10-01',
    is_settled: false,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'e2',
    household_id: 'h1',
    title: 'スーパー買い出し',
    amount: 4800,
    category: 'food',
    paid_by_name: '夫',
    split_type: 'ratio',
    expense_date: '2026-10-03',
    is_settled: false,
    created_at: '2026-10-03T10:00:00Z',
  },
  {
    id: 'e3',
    household_id: 'h1',
    title: 'ドラッグストア',
    amount: 2100,
    category: 'daily',
    paid_by_name: '妻',
    split_type: 'ratio',
    expense_date: '2026-10-02',
    is_settled: false,
    created_at: '2026-10-02T10:00:00Z',
  },
  {
    id: 'e4',
    household_id: 'h1',
    title: 'スターバックス',
    amount: 1400,
    category: 'dining',
    paid_by_name: '妻',
    split_type: 'equal',
    expense_date: '2026-10-03',
    is_settled: false,
    created_at: '2026-10-03T12:00:00Z',
  },
];

const presets = getQuickPresets(sampleExpenses, mockHousehold, 4);
assert.strictEqual(presets.length, 4, '4件返されること');
assert.strictEqual(presets[0].title, 'スーパー買い出し', '最も頻度の高い「スーパー買い出し」が1位であること');
assert.strictEqual(presets[0].count, 2, '出現回数が2回と集計されていること');
assert.strictEqual(presets[0].default_amount, 4800, '最新の日付の金額(4800)が保持されること');

// スターバックスの負担方法が保持されているか
const sbux = presets.find((p) => p.title === 'スターバックス');
assert(sbux, 'スターバックスが含まれること');
assert.strictEqual(sbux?.split_type, 'equal', '等分(equal)が正しく保持されること');
assert.strictEqual(sbux?.paid_by_name, '妻', '支払者が保持されること');
console.log('  支出履歴からの抽出: ALL PASSED ✅\n');

// 3. renderBudgetCard テスト
console.log('3. renderBudgetCard (予算・前月比較カード)');

// ケースA: 予算未設定時
const htmlNoBudget = renderBudgetCard(undefined, 80000, 95000, '2026年10月');
assert(htmlNoBudget.includes('目標予算を設定'), '未設定時は設定ボタンが表示されること');
assert(htmlNoBudget.includes('節約中'), '前月(95000)より少なければ節約中バッジが表示されること');
console.log('  ケースA (予算未設定): ALL PASSED ✅');

// ケースB: 予算設定時 (余裕あり 60%)
const htmlHealthy = renderBudgetCard(150000, 90000, 100000, '2026年10月');
assert(htmlHealthy.includes('¥150,000'), '目標予算が表示されること');
assert(htmlHealthy.includes('¥90,000'), '使用額が表示されること');
assert(htmlHealthy.includes('60%'), '60%と計算されること');
assert(htmlHealthy.includes('残り ¥60,000'), '残り金額が表示されること');
assert(htmlHealthy.includes('節約中'), '前月(100000)より節約中が表示されること');
console.log('  ケースB (通常 60%): ALL PASSED ✅');

// ケースC: 予算設定時 (注意 85%)
const htmlWarning = renderBudgetCard(150000, 127500, 120000, '2026年10月');
assert(htmlWarning.includes('85%'), '85%と計算されること');
assert(htmlWarning.includes('残り ¥22,500'), '残り金額が表示されること');
assert(htmlWarning.includes('より +¥7,500'), '前月比プラスが表示されること');
console.log('  ケースC (注意 85%): ALL PASSED ✅');

// ケースD: 予算超過 (110%)
const htmlOver = renderBudgetCard(150000, 165000, 140000, '2026年10月');
assert(htmlOver.includes('超過'), '超過バッジが表示されること');
assert(htmlOver.includes('¥15,000 超過'), '15,000円超過と表示されること');
console.log('  ケースD (超過 110%): ALL PASSED ✅\n');

console.log('🎉 ALL PRESET & BUDGET TESTS COMPLETED SUCCESSFULLY! 🎉');
