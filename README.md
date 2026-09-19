# PairPay (ペアペイ) - 夫婦特化型 共通家計簿＆折半精算 PWA

夫婦間の「共通費用の立替」「月末の折半/傾斜精算」を最小限のタップ数で記録し、割り勘ストレスをゼロにするモバイルファーストのWebアプリです。

## 主な機能 (Phase 1: 最小構成MVP)

- 📱 **親指1タップ入力**: 画面下部の固定ボタンから金額・立替者・カテゴリを即座に登録
- ⚖️ **リアルタイム折半/傾斜精算**: 登録した瞬間に「妻 ➔ 夫 へ 【¥XX,XXX】 送金」を自動計算
- 📊 **カテゴリ別内訳**: 食費・日用品・外食などの支出比率をビジュアルバーで可視化
- 📋 **LINE請求文面ワンタップコピー**: 送金依頼メッセージをクリップボードに整形コピー
- ⚙️ **負担割合・名前カスタマイズ**: 50:50折半のほか、60:40などの傾斜配分や呼び名の変更に対応
- 💾 **LocalStorageデータ永続化**: バックエンド事前登録不要でブラウザ上で即座に利用可能

## 技術スタック

- **フロントエンド**: Vite, TypeScript, Tailwind CSS v4, Lucide Icons
- **静的ホスティング**: GitHub Pages (GitHub Actions 自動デプロイ対応)

## 開発・ビルド手順

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (http://localhost:5173)
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## GitHub Pages 公開手順

1. GitHub上にリポジトリを作成し、コードをプッシュします。
2. リポジトリの **Settings > Pages** を開きます。
3. **Build and deployment > Source** で **GitHub Actions** を選択します。
4. `main` ブランチにプッシュされると、自動的に `.github/workflows/deploy.yml` が実行され、公開されます。

## 今後のロードマップ

- **Phase 2**: Supabase 連携（世帯ID共有、2台のスマホ間でのリアルタイム同期）
- **Phase 3**: PWA化（ホーム画面追加、Service Workerによるオフライン対応）
