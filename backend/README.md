# AI Web Analytics System - Backend

TypeScriptで構築されたAIウェブ分析システムのバックエンドAPI。

## 技術スタック

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Authentication**: JWT
- **Logging**: Winston
- **Validation**: Zod + express-validator
- **Testing**: Jest
- **Linting**: ESLint

## 主要機能

- ✅ RESTful API設計
- ✅ TypeScript型安全性
- ✅ JWT認証システム
- ✅ ロールベースアクセス制御
- ✅ レート制限
- ✅ リクエストバリデーション
- ✅ エラーハンドリング
- ✅ 構造化ログ
- ✅ データベースマイグレーション
- ✅ キャッシング（Redis）
- ✅ セキュリティ対策
- ✅ CORS設定
- ✅ ヘルスチェック

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して適切な値を設定してください。

### 3. データベースの設定

```bash
# Prismaクライアントの生成
npm run prisma:generate

# データベースマイグレーション
npm run prisma:migrate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## 利用可能なスクリプト

- `npm run dev` - 開発モードでサーバー起動
- `npm run build` - TypeScriptのビルド
- `npm start` - 本番モードでサーバー起動
- `npm run prisma:generate` - Prismaクライアント生成
- `npm run prisma:migrate` - データベースマイグレーション
- `npm run prisma:studio` - Prisma Studio起動
- `npm run lint` - ESLintによるコード検査
- `npm test` - Jestテスト実行

## API エンドポイント

### 認証 (`/api/v1/auth`)
- `POST /register` - ユーザー登録
- `POST /login` - ログイン
- `POST /refresh` - トークン更新
- `POST /logout` - ログアウト
- `POST /forgot-password` - パスワードリセット
- `POST /reset-password` - パスワードリセット実行

### ユーザー管理 (`/api/v1/users`)
- `GET /profile` - ユーザープロフィール取得
- `PUT /profile` - プロフィール更新
- `PUT /password` - パスワード変更
- `DELETE /account` - アカウント削除

### サイト管理 (`/api/v1/sites`)
- `GET /` - サイト一覧取得
- `POST /` - サイト作成
- `GET /:id` - サイト詳細取得
- `PUT /:id` - サイト更新
- `DELETE /:id` - サイト削除
- `GET /:id/tracking-code` - トラッキングコード取得

### アナリティクス (`/api/v1/analytics`)
- `POST /collect` - データ収集
- `GET /dashboard/:siteId` - ダッシュボードデータ
- `GET /pageviews/:siteId` - ページビュー分析
- `GET /sessions/:siteId` - セッション分析
- `GET /realtime/:siteId` - リアルタイム分析
- `GET /sources/:siteId` - トラフィックソース分析
- `GET /geography/:siteId` - 地理的分析
- `GET /devices/:siteId` - デバイス分析
- `GET /insights/:siteId` - AI インサイト

### 管理者 (`/api/v1/admin`)
- `GET /stats` - システム統計
- `GET /health` - システムヘルス
- `GET /users` - ユーザー管理
- `GET /sites` - サイト管理
- `GET /audit-logs` - 監査ログ

## データベーススキーマ

### 主要テーブル

- **users** - ユーザー情報
- **sites** - サイト情報
- **page_views** - ページビューデータ
- **sessions** - セッションデータ
- **refresh_tokens** - リフレッシュトークン
- **audit_logs** - 監査ログ

## セキュリティ機能

- **Helmet**: HTTP セキュリティヘッダー
- **CORS**: クロスオリジン要求制御
- **Rate Limiting**: レート制限
- **JWT**: JSON Web Token認証
- **Password Hashing**: bcryptによるパスワードハッシュ化
- **Input Validation**: 入力値検証
- **SQL Injection Prevention**: Prisma ORMによる防御

## ログ機能

- 構造化ログ（JSON形式）
- ログレベル設定
- ファイル出力（error.log, combined.log）
- 本番環境での適切なログローテーション

## エラーハンドリング

- カスタムエラークラス
- 統一されたエラーレスポンス形式
- 開発環境でのスタックトレース表示
- エラーログ記録

## 開発ガイドライン

### コーディング規約
- ESLint設定に従ったコードスタイル
- TypeScript strict モード
- 適切な型定義の使用
- エラーハンドリングの実装

### ファイル構造
```
src/
├── config/         # 設定ファイル
├── controllers/    # コントローラー
├── middleware/     # ミドルウェア
├── routes/         # ルート定義
├── services/       # ビジネスロジック
├── utils/          # ユーティリティ
├── types/          # 型定義
└── server.ts       # メインサーバーファイル
```

## デプロイメント

### 本番環境での推奨設定

1. **環境変数**
   - `NODE_ENV=production`
   - 適切なデータベースURL
   - 強力なJWTシークレット

2. **プロセス管理**
   - PM2またはDocker使用推奨
   - ヘルスチェック設定

3. **データベース**
   - 接続プール設定
   - バックアップ戦略

4. **セキュリティ**
   - HTTPS必須
   - 適切なCORS設定
   - セキュリティヘッダー

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - DATABASE_URLの確認
   - PostgreSQLサーバーの起動確認

2. **Redis接続エラー**
   - Redis設定の確認
   - 本番環境では継続（警告のみ）

3. **トークンエラー**
   - JWT_SECRETの設定確認
   - トークン有効期限の確認

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。