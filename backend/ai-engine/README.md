# AI分析エンジン (AI Analytics Engine)

Google Analytics Intelligence、Adobe Senseiを超える次世代AI分析システム

## 概要

この革新的なAI分析エンジンは、以下の機能を提供します：

### 🤖 コア機能
- **AI分析基盤**: Python FastAPI + OpenAI API + LangChain
- **高速データ処理**: 並行処理とキャッシュ最適化
- **インテリジェント分析**: 機械学習と統計解析の融合

### 🔍 分析機能
- **異常値自動検知**: 統計的手法とML-based検知
- **トレンド分析と予測**: 時系列分析と将来予測
- **ユーザー行動パターン解析**: クラスタリングと行動予測
- **コンバージョン最適化提案**: データドリブンな改善提案
- **競合他社との比較分析**: 業界ベンチマークとの比較

### 💡 インサイト生成
- **自然言語での分析結果説明**: 人間が理解しやすい説明
- **実行可能な改善提案**: 具体的なアクションプラン
- **ROI予測機能**: 投資対効果の予測
- **A/Bテスト推奨事項**: 最適化のための提案

### ⚡ リアルタイム処理
- **ストリーミング分析**: リアルタイムデータ処理
- **リアルタイム警告システム**: 即座のアラート通知
- **自動レポート生成**: 定期的なレポート作成
- **予測的アラート**: 問題の事前検知

## アーキテクチャ

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Main Backend   │    │  AI Analytics   │
│   (Next.js)     │◄──►│   (Node.js)      │◄──►│   Engine        │
│                 │    │                  │    │   (FastAPI)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   PostgreSQL     │    │     Redis       │
                       │   Database       │    │     Cache       │
                       └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │   OpenAI API    │
                                              │   + LangChain   │
                                              └─────────────────┘
```

## セットアップ

### 1. 環境設定

```bash
# 仮想環境作成
python -m venv venv
source venv/bin/activate  # Linux/Mac
# または
venv\Scripts\activate     # Windows

# 依存関係インストール
pip install -r requirements.txt
```

### 2. 環境変数設定

```bash
cp .env.example .env
# .envファイルを編集して適切な値を設定
```

### 3. Redis起動

```bash
# Docker使用の場合
docker run -d --name redis -p 6379:6379 redis:alpine

# または
redis-server
```

### 4. アプリケーション起動

```bash
# 開発モード
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# 本番モード
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API エンドポイント

### 基本情報
- **Base URL**: `http://localhost:8001`
- **API バージョン**: `v1`
- **ドキュメント**: `http://localhost:8001/docs`

### 主要エンドポイント

#### 包括的分析
```http
POST /api/v1/analyze/comprehensive
Content-Type: application/json

{
  "site_id": "your-site-id",
  "analysis_types": ["comprehensive"],
  "date_range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

#### インサイト生成
```http
POST /api/v1/insights/generate
Content-Type: application/json

{
  "site_id": "your-site-id",
  "analytics_data": {...},
  "focus_areas": ["performance", "conversion"]
}
```

#### 異常値検知
```http
POST /api/v1/anomalies/detect
Content-Type: application/json

{
  "site_id": "your-site-id",
  "days": 30
}
```

#### トレンド分析
```http
POST /api/v1/trends/analyze
Content-Type: application/json

{
  "site_id": "your-site-id",
  "period": "30d"
}
```

#### リアルタイム分析
```http
POST /api/v1/realtime/analyze
Content-Type: application/json

{
  "site_id": "your-site-id",
  "event_data": [...],
  "analysis_type": "standard"
}
```

#### WebSocketエンドポイント
```
ws://localhost:8001/ws/realtime/{site_id}
```

## Docker デプロイ

### 単体実行
```bash
docker build -t ai-analytics-engine .
docker run -p 8001:8001 --env-file .env ai-analytics-engine
```

### docker-compose使用
```yaml
version: '3.8'
services:
  ai-engine:
    build: .
    ports:
      - "8001:8001"
    env_file:
      - .env
    depends_on:
      - redis
      
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## 設定オプション

### OpenAI設定
- `OPENAI_API_KEY`: OpenAI APIキー
- `OPENAI_MODEL`: 使用するGPTモデル
- `OPENAI_MAX_TOKENS`: 最大トークン数
- `OPENAI_TEMPERATURE`: 創造性パラメータ

### 分析設定
- `AI_ANALYSIS_BATCH_SIZE`: バッチ処理サイズ
- `AI_CONFIDENCE_THRESHOLD`: 信頼度閾値
- `ANOMALY_SENSITIVITY`: 異常検知感度
- `REALTIME_PROCESSING_INTERVAL`: リアルタイム処理間隔

### パフォーマンス設定
- `MAX_CONCURRENT_ANALYSES`: 最大同時分析数
- `CACHE_ENABLED`: キャッシュ有効化
- `DATABASE_POOL_SIZE`: DBコネクションプール

## 監視とログ

### ヘルスチェック
```bash
curl http://localhost:8001/health
```

### ログレベル
- `DEBUG`: 詳細なデバッグ情報
- `INFO`: 一般的な情報（デフォルト）
- `WARNING`: 警告メッセージ
- `ERROR`: エラーメッセージ

### メトリクス
- 分析処理時間
- API応答時間
- エラー率
- キャッシュヒット率

## セキュリティ

### 認証
- JWTトークンベース認証
- APIキー認証
- レート制限

### データ保護
- 暗号化通信（HTTPS）
- データ匿名化
- GDPR準拠

## トラブルシューティング

### よくある問題

#### 1. OpenAI API接続エラー
```bash
# APIキーを確認
echo $OPENAI_API_KEY

# ネットワーク接続確認
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

#### 2. Redis接続エラー
```bash
# Redis稼働確認
redis-cli ping

# 接続情報確認
echo $REDIS_URL
```

#### 3. メモリ不足
```bash
# メモリ使用量確認
docker stats

# ワーカー数削減
uvicorn main:app --workers 2
```

## 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## サポート

- 📧 Email: support@example.com
- 💬 Discord: [コミュニティサーバー](https://discord.gg/example)
- 📚 Documentation: [詳細ドキュメント](https://docs.example.com)

---

**Google Analytics Intelligence、Adobe Senseiを超える次世代AI分析システム** 🚀