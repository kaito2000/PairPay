import { escapeHtml } from '../src/utils/sanitize.ts';

console.log('=== セキュリティ・サニタイズ単体テスト開始 ===\n');

// 1. escapeHtml の検証
console.log('1. XSSサニタイズ（escapeHtml）テスト');
const testCases = [
  { input: '<script>alert("XSS")</script>', expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' },
  { input: '"><img src=x onerror=alert(1)>', expected: '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;' },
  { input: "Tom & 'Jerry'", expected: 'Tom &amp; &#039;Jerry&#039;' },
  { input: 'normal text 123', expected: 'normal text 123' },
  { input: '', expected: '' },
];

for (const tc of testCases) {
  const result = escapeHtml(tc.input);
  if (result !== tc.expected) {
    throw new Error(`XSSサニタイズ失敗: 入力="${tc.input}", 期待値="${tc.expected}", 実際="${result}"`);
  }
}
console.log('  escapeHtml: ALL PASSED ✅\n');

// 2. 属性値エスケープ（Attribute Breakout防御）テスト
console.log('2. 属性値ブレイクアウト防御テスト');
const maliciousName = '"><input type="text" autofocus onfocus="alert(1)">';
const escapedName = escapeHtml(maliciousName);

// エスケープ後の文字列に未エスケープの " や < が含まれていないこと
if (escapedName.includes('"') || escapedName.includes('<') || escapedName.includes('>')) {
  throw new Error(`属性ブレイクアウト文字が残存しています: ${escapedName}`);
}
console.log('  属性値ブレイクアウト防御: ALL PASSED ✅\n');

console.log('🎉 ALL SECURITY TESTS COMPLETED SUCCESSFULLY! 🎉');
