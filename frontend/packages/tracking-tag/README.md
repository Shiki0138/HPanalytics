# AI Analytics Tracking Tag

世界トップレベルの性能を誇る軽量JavaScriptトラッキングライブラリです。

## 特徴

### 🚀 **高性能**
- **軽量**: わずか4.75KB（gzip圧縮）
- **非同期読み込み**: ページ読み込み速度に影響なし
- **効率的な処理**: バッチ送信とキューイングシステム

### 🛡️ **信頼性**
- **オフライン対応**: ローカルストレージによる自動再送
- **エラーハンドリング**: 完全なエラー追跡とフォールバック
- **クロスブラウザ対応**: モダンブラウザから古いブラウザまで

### 🎯 **高機能**
- **Web Vitals**: Core Web Vitals自動収集
- **ユーザートラッキング**: セッション管理とユーザー識別
- **カスタムイベント**: 柔軟なイベント定義
- **リアルタイム**: 即座にデータ送信

### 🔒 **セキュリティ**
- **データ検証**: 厳格なデータ検証とサニタイゼーション
- **レート制限**: スパム防止機能
- **プライバシー保護**: GDPR準拠のオプション設定

## クイックスタート

### 1. スクリプトタグで導入

```html
<!-- 非同期読み込み -->
<script async src="/tracking-tag/index.js"></script>
<script>
  // トラッカー初期化
  aiAnalytics = aiAnalytics || [];
  aiAnalytics.push(['init', {
    projectId: 'your-project-id',
    endpoint: '/api/collect'
  }]);
</script>
```

### 2. ES Modules で導入

```javascript
import { createTracker } from '@ai-analytics/tracking-tag';

const tracker = createTracker();
tracker.init({
  projectId: 'your-project-id',
  endpoint: '/api/collect'
});
```

## 基本的な使用方法

### トラッカー初期化

```javascript
aiAnalytics.init({
  projectId: 'your-project-id',        // 必須: プロジェクトID
  endpoint: '/api/collect',             // APIエンドポイント
  debug: false,                         // デバッグモード
  sampleRate: 1.0,                     // サンプリング率 (0-1)
  webVitals: true,                     // Web Vitals収集
  errorTracking: true,                 // エラー追跡
  offlineStorage: true,                // オフライン対応
  batchSize: 10,                       // バッチサイズ
  flushInterval: 5000,                 // 送信間隔(ms)
  cookieConsent: () => true            // クッキー同意チェック
});
```

### ページビュー追跡

```javascript
// 現在のページを追跡
aiAnalytics.page();

// カスタムページ情報
aiAnalytics.page('/custom-page', 'カスタムページ', {
  section: 'main',
  category: 'product'
});
```

### イベント追跡

```javascript
// シンプルなイベント
aiAnalytics.track('button_click');

// プロパティ付きイベント
aiAnalytics.track('purchase', {
  product_id: 'prod_123',
  price: 2980,
  currency: 'JPY',
  category: 'electronics'
});
```

### ユーザー識別

```javascript
// ユーザーを識別
aiAnalytics.identify('user_12345', {
  name: '田中太郎',
  email: 'tanaka@example.com',
  plan: 'premium'
});

// ユーザープロパティのみ更新
aiAnalytics.setUserProperties({
  last_login: new Date().toISOString(),
  preferences: { theme: 'dark' }
});
```

## 高度な機能

### Web Vitals自動収集

```javascript
// 設定で有効化
aiAnalytics.init({
  projectId: 'your-project-id',
  webVitals: true  // Core Web Vitalsを自動収集
});

// 以下のメトリクスが自動で収集されます:
// - FCP (First Contentful Paint)
// - LCP (Largest Contentful Paint)  
// - FID (First Input Delay)
// - CLS (Cumulative Layout Shift)
// - TTFB (Time to First Byte)
```

### エラー追跡

```javascript
// 設定で有効化
aiAnalytics.init({
  projectId: 'your-project-id',
  errorTracking: true  // JavaScript エラーを自動追跡
});

// 手動でエラーを追跡
try {
  riskyFunction();
} catch (error) {
  aiAnalytics.track('custom_error', {
    error_message: error.message,
    error_stack: error.stack,
    context: 'user_action'
  });
}
```

### オフライン対応

```javascript
// ネットワークが回復したときに自動で再送信
aiAnalytics.init({
  projectId: 'your-project-id',
  offlineStorage: true,  // ローカルストレージに保存
  batchSize: 20,         // オフライン時のバッチサイズ
});
```

### 手動送信制御

```javascript
// イベントを即座に送信
await aiAnalytics.flush();

// トラッカーをリセット
aiAnalytics.reset();

// 現在の状態を取得
const sessionId = aiAnalytics.getSessionId();
const userId = aiAnalytics.getUserId();
```

## APIリファレンス

### `aiAnalytics.init(config)`

トラッカーを初期化します。

**パラメータ:**
- `config` (TrackerConfig): 設定オブジェクト

**設定オプション:**
```typescript
interface TrackerConfig {
  projectId: string;           // プロジェクトID (必須)
  endpoint?: string;           // APIエンドポイント
  debug?: boolean;             // デバッグモード
  sampleRate?: number;         // サンプリング率 (0-1)
  webVitals?: boolean;         // Web Vitals収集
  errorTracking?: boolean;     // エラー追跡
  offlineStorage?: boolean;    // オフライン対応
  batchSize?: number;          // バッチサイズ
  flushInterval?: number;      // 送信間隔(ms)
  cookieDomain?: string;       // クッキードメイン
  cookieConsent?: () => boolean; // クッキー同意チェック関数
}
```

### `aiAnalytics.track(eventType, properties?)`

カスタムイベントを追跡します。

**パラメータ:**
- `eventType` (string): イベントタイプ
- `properties` (object, optional): イベントプロパティ

### `aiAnalytics.page(url?, title?, properties?)`

ページビューを追跡します。

**パラメータ:**
- `url` (string, optional): ページURL
- `title` (string, optional): ページタイトル  
- `properties` (object, optional): ページプロパティ

### `aiAnalytics.identify(userId, properties?)`

ユーザーを識別します。

**パラメータ:**
- `userId` (string): ユーザーID
- `properties` (object, optional): ユーザープロパティ

### `aiAnalytics.setUserProperties(properties)`

ユーザープロパティを設定します。

**パラメータ:**
- `properties` (object): ユーザープロパティ

### `aiAnalytics.flush()`

キューされたイベントを即座に送信します。

**戻り値:** `Promise<void>`

### `aiAnalytics.reset()`

トラッカーの状態をリセットします。

### `aiAnalytics.getSessionId()`

現在のセッションIDを取得します。

**戻り値:** `string`

### `aiAnalytics.getUserId()`

現在のユーザーIDを取得します。

**戻り値:** `string | null`

## データ形式

### イベントデータ

```typescript
interface TrackingEvent {
  type: string;                    // イベントタイプ
  timestamp: number;               // タイムスタンプ
  sessionId: string;               // セッションID
  userId?: string;                 // ユーザーID
  properties?: Record<string, any>; // イベントプロパティ
}
```

### デバイス情報

```typescript
interface DeviceInfo {
  userAgent: string;          // ユーザーエージェント
  screenResolution: string;   // 画面解像度
  viewportSize: string;       // ビューポートサイズ
  devicePixelRatio: number;   // デバイスピクセル比
  language: string;           // 言語
  timezone: string;           // タイムゾーン
  isMobile: boolean;          // モバイルデバイス判定
  isTouch: boolean;           // タッチデバイス判定
}
```

## サーバーサイド実装

### データ収集API

```typescript
// POST /api/collect
interface CollectRequest {
  projectId: string;
  sessionId: string;
  userId?: string;
  userProperties?: Record<string, any>;
  deviceInfo: DeviceInfo;
  events: TrackingEvent[];
  timestamp: number;
}
```

### レスポンス

```typescript
interface CollectResponse {
  success: boolean;
  processed: number;
  processingTime: number;
}
```

## パフォーマンス

### ベンチマーク結果

- **ファイルサイズ**: 4.75KB (gzip)
- **初期化時間**: <1ms
- **イベント処理**: <0.1ms/イベント
- **バッチ送信**: 最大100イベント/リクエスト
- **オフライン対応**: 最大1000イベント保持

### 最適化のポイント

1. **遅延読み込み**: DOMContentLoaded後に初期化
2. **バッチ処理**: 複数イベントをまとめて送信
3. **圧縮**: gzip圧縮で約70%削減
4. **キャッシュ**: ローカルストレージでオフライン対応

## ブラウザサポート

- ✅ Chrome 60+
- ✅ Firefox 55+  
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ iOS Safari 12+
- ✅ Android Chrome 60+

## セキュリティ

### データ保護
- 自動データサニタイゼーション
- 循環参照の安全な処理
- XSS攻撃防止

### プライバシー
- GDPR準拠オプション
- クッキー同意管理
- データ最小化原則

### レート制限
- IP別リクエスト制限
- スパム検知機能
- Bot トラフィック除外

## 開発とビルド

### 開発環境セットアップ

```bash
cd packages/tracking-tag
npm install
npm run build:dev  # 開発用ビルド（ウォッチモード）
```

### 本番ビルド

```bash
npm run build      # 本番用ビルド
npm run size       # ファイルサイズチェック
npm test           # テスト実行
```

### テスト

```bash
npm test           # 全テスト実行
npm run test:watch # ウォッチモード
```

## デバッグ

### デバッグモード有効化

```javascript
aiAnalytics.init({
  projectId: 'your-project-id',
  debug: true  // コンソールにログ出力
});
```

### ローカルテスト

1. デモページを開く: `http://localhost:3000/tracking-demo.html`
2. ブラウザの開発者ツールでネットワークタブを確認
3. `/api/collect` エンドポイントへのリクエストを確認

## トラブルシューティング

### よくある問題

**Q: イベントが送信されない**
A: ネットワークタブで `/api/collect` へのリクエストを確認してください。404エラーの場合はエンドポイント設定を確認してください。

**Q: コンソールエラーが発生する**  
A: ブラウザサポート状況を確認してください。古いブラウザではポリフィルが必要な場合があります。

**Q: Web Vitals が収集されない**
A: Performance API対応ブラウザで `webVitals: true` が設定されているか確認してください。

**Q: オフラインでイベントが失われる**
A: `offlineStorage: true` が設定され、ローカルストレージが利用可能か確認してください。

## ライセンス

MIT License

## サポート

- 📧 Email: support@ai-analytics.com
- 📚 Documentation: https://docs.ai-analytics.com  
- 🐛 Issues: https://github.com/ai-analytics/tracking-tag/issues

## 貢献

プルリクエストを歓迎します。大きな変更を行う前に、issueを作成して議論してください。

---

**AI Analytics Tracking Tag** - 世界トップレベルの性能と信頼性を提供するJavaScriptトラッキングライブラリ