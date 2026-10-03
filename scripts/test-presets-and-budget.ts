import assert from 'node:assert';
import { getQuickPresets } from '../src/logic/preset.ts';
import { Expense, Household } from '../src/types.ts';

console.log('=== クイックプリセット機能 単体テスト開始 ===\n');

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

// 3. タグ機能 (getAllTags & parseTagsInput) テスト
console.log('3. タグ機能のテスト (parseTagsInput & getAllTags)');
import { getAllTags, parseTagsInput } from '../src/logic/preset.ts';

// 3-1. parseTagsInput テスト
const parsed1 = parseTagsInput('#旅行, 家具  #記念日');
assert.deepStrictEqual(parsed1, ['旅行', '家具', '記念日'], 'カンマ・空白・#が正しくパースされること');

const parsed2 = parseTagsInput('旅行、外食，カフェ');
assert.deepStrictEqual(parsed2, ['旅行', '外食', 'カフェ'], '全角カンマや読点もパースされること');

const parsedEmpty = parseTagsInput('');
assert.deepStrictEqual(parsedEmpty, [], '空文字は空配列');

// 3-2. getAllTags テスト
const expensesWithTags: Expense[] = [
  { ...sampleExpenses[0], tags: ['旅行', '食費'] },
  { ...sampleExpenses[1], tags: ['旅行', 'お土産'] },
  { ...sampleExpenses[2], tags: ['家具'] },
  { ...sampleExpenses[3], tags: [] },
];

const tagsList = getAllTags(expensesWithTags);
assert.strictEqual(tagsList[0], '旅行', '最頻タグの「旅行」が先頭に来ること');
assert(tagsList.includes('食費'), '「食費」が含まれること');
assert(tagsList.includes('お土産'), '「お土産」が含まれること');
assert(tagsList.includes('家具'), '「家具」が含まれること');
console.log('  タグ機能 (parseTagsInput & getAllTags): ALL PASSED ✅\n');

console.log('🎉 ALL PRESET & TAG TESTS COMPLETED SUCCESSFULLY! 🎉');


