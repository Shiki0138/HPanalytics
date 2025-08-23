# AI Web Analytics System - Frontend

Next.jsベースのAIウェブ分析システムのフロントエンドアプリケーションです。

## 技術スタック

- **Next.js 15** - Reactフレームワーク
- **TypeScript** - 型安全な開発
- **Material-UI (MUI)** - UIコンポーネントライブラリ
- **Redux Toolkit** - 状態管理
- **RTK Query** - API通信
- **ESLint & Prettier** - コード品質管理

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
```bash
cp .env.local.example .env.local
```

3. 開発サーバーの起動:
```bash
npm run dev
```

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - ESLintでコードをチェック
- `npm run format` - Prettierでコードをフォーマット
- `npm run type-check` - TypeScriptの型チェック

## プロジェクト構造

```
frontend/
├── app/                    # Next.js App Router
│   ├── dashboard/         # ダッシュボードページ
│   ├── login/            # ログインページ
│   ├── settings/         # 設定ページ
│   ├── layout.tsx        # ルートレイアウト
│   ├── page.tsx          # ホームページ
│   ├── not-found.tsx     # 404ページ
│   └── error.tsx         # エラーページ
├── components/            # Reactコンポーネント
│   ├── common/           # 共通コンポーネント
│   └── layout/           # レイアウトコンポーネント
├── lib/                  # ユーティリティとロジック
│   ├── redux/            # Redux関連
│   └── utils/            # ヘルパー関数
├── styles/               # スタイル関連
├── types/                # TypeScript型定義
└── public/               # 静的ファイル
```

## 主要機能

### 認証システム
- JWT認証
- ルート保護
- 自動リダイレクト

### 状態管理
- Redux Toolkit
- RTK Query for API
- 永続化対応

### UIコンポーネント
- Material-UI テーマ
- レスポンシブデザイン
- アクセシビリティ対応

### 開発体験
- TypeScript厳格モード
- ESLint設定
- Prettier自動フォーマット
- Hot reload対応