import { CATEGORIES, Expense, Household } from '../types.ts';

/**
 * CSV値のエスケープ処理 (RFC 4180準拠)
 */
function escapeCsvValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  // カンマ、ダブルクォーテーション、改行が含まれる場合は引用符で囲み、内部の引用符を二重化
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * 負担方法の日本語ラベルを取得
 */
export function getSplitTypeLabel(splitType: string | undefined, household: Household): string {
  switch (splitType) {
    case 'equal':
      return '等分 (50:50)';
    case 'user1_full':
      return `${household.user1_name}が全額`;
    case 'user2_full':
      return `${household.user2_name}が全額`;
    case 'ratio':
    default:
      return `基本比率 (${household.ratio_user1}:${household.ratio_user2})`;
  }
}

/**
 * 支出リストからCSV文字列（UTF-8 BOM付き）を生成
 */
export function generateExpensesCsv(expenses: Expense[], household: Household): string {
  const headers = [
    '日付',
    'タイトル/メモ',
    '金額',
    'カテゴリ',
    '立替者',
    '負担方法',
    '精算状況',
    '登録日時',
  ];

  const rows = expenses.map((exp) => {
    const categoryLabel = CATEGORIES[exp.category]?.label || exp.category;
    const splitLabel = getSplitTypeLabel(exp.split_type, household);
    const settledLabel = exp.is_settled ? '精算済' : '未精算';

    return [
      escapeCsvValue(exp.expense_date),
      escapeCsvValue(exp.title || ''),
      escapeCsvValue(exp.amount),
      escapeCsvValue(categoryLabel),
      escapeCsvValue(exp.paid_by_name),
      escapeCsvValue(splitLabel),
      escapeCsvValue(settledLabel),
      escapeCsvValue(exp.created_at || ''),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) を先頭に付与してExcelでの文字化けを防止
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * ブラウザでCSVファイルをダウンロード
 */
export function downloadExpensesCsv(expenses: Expense[], household: Household, filename: string): void {
  const csvContent = generateExpensesCsv(expenses, household);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
