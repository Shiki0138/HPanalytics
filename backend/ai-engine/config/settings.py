"""
AI分析エンジン設定管理
"""
import os
from typing import List, Optional, Dict, Any
from pydantic import BaseSettings, Field
from functools import lru_cache

class Settings(BaseSettings):
    """AI分析エンジンの設定"""
    
    # アプリケーション基本設定
    app_name: str = "AI Analytics Engine"
    app_version: str = "1.0.0"
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True, env="DEBUG")
    
    # API設定
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8001, env="API_PORT")
    api_prefix: str = "/api/v1"
    
    # OpenAI API設定
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4-turbo-preview", env="OPENAI_MODEL")
    openai_max_tokens: int = Field(default=4000, env="OPENAI_MAX_TOKENS")
    openai_temperature: float = Field(default=0.3, env="OPENAI_TEMPERATURE")
    
    # LangChain設定
    langchain_verbose: bool = Field(default=False, env="LANGCHAIN_VERBOSE")
    langchain_cache: bool = Field(default=True, env="LANGCHAIN_CACHE")
    
    # データベース設定
    database_url: str = Field(..., env="DATABASE_URL")
    database_pool_size: int = Field(default=20, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=30, env="DATABASE_MAX_OVERFLOW")
    
    # Redis設定 (キャッシュ・セッション)
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_cache_ttl: int = Field(default=3600, env="REDIS_CACHE_TTL")  # 1時間
    
    # Celery設定 (バックグラウンドタスク)
    celery_broker_url: str = Field(default="redis://localhost:6379/0", env="CELERY_BROKER_URL")
    celery_result_backend: str = Field(default="redis://localhost:6379/0", env="CELERY_RESULT_BACKEND")
    
    # 外部APIエンドポイント
    main_backend_url: str = Field(default="http://localhost:3001", env="MAIN_BACKEND_URL")
    analytics_api_timeout: int = Field(default=30, env="ANALYTICS_API_TIMEOUT")
    
    # AI分析設定
    ai_analysis_batch_size: int = Field(default=1000, env="AI_ANALYSIS_BATCH_SIZE")
    ai_analysis_timeout: int = Field(default=300, env="AI_ANALYSIS_TIMEOUT")  # 5分
    ai_confidence_threshold: float = Field(default=0.8, env="AI_CONFIDENCE_THRESHOLD")
    
    # 異常値検知設定
    anomaly_sensitivity: float = Field(default=0.05, env="ANOMALY_SENSITIVITY")  # 5%
    anomaly_window_size: int = Field(default=24, env="ANOMALY_WINDOW_SIZE")  # 24時間
    anomaly_min_data_points: int = Field(default=10, env="ANOMALY_MIN_DATA_POINTS")
    
    # トレンド分析設定
    trend_analysis_periods: List[str] = Field(
        default=["7d", "30d", "90d", "365d"],
        env="TREND_ANALYSIS_PERIODS"
    )
    trend_forecasting_days: int = Field(default=30, env="TREND_FORECASTING_DAYS")
    trend_confidence_interval: float = Field(default=0.95, env="TREND_CONFIDENCE_INTERVAL")
    
    # 行動分析設定
    behavior_session_timeout: int = Field(default=1800, env="BEHAVIOR_SESSION_TIMEOUT")  # 30分
    behavior_min_events: int = Field(default=3, env="BEHAVIOR_MIN_EVENTS")
    behavior_funnel_stages: List[str] = Field(
        default=["visit", "view", "interact", "convert"],
        env="BEHAVIOR_FUNNEL_STAGES"
    )
    
    # リアルタイム処理設定
    realtime_batch_size: int = Field(default=100, env="REALTIME_BATCH_SIZE")
    realtime_processing_interval: float = Field(default=1.0, env="REALTIME_PROCESSING_INTERVAL")  # 1秒
    realtime_alert_cooldown: int = Field(default=300, env="REALTIME_ALERT_COOLDOWN")  # 5分
    
    # WebSocket設定
    websocket_ping_interval: int = Field(default=20, env="WEBSOCKET_PING_INTERVAL")
    websocket_ping_timeout: int = Field(default=10, env="WEBSOCKET_PING_TIMEOUT")
    websocket_max_connections: int = Field(default=1000, env="WEBSOCKET_MAX_CONNECTIONS")
    
    # ログ設定
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: Optional[str] = Field(default=None, env="LOG_FILE")
    log_max_size: int = Field(default=10485760, env="LOG_MAX_SIZE")  # 10MB
    log_backup_count: int = Field(default=5, env="LOG_BACKUP_COUNT")
    
    # セキュリティ設定
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # CORS設定
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        env="CORS_ORIGINS"
    )
    cors_allow_credentials: bool = Field(default=True, env="CORS_ALLOW_CREDENTIALS")
    
    # パフォーマンス設定
    max_concurrent_analyses: int = Field(default=10, env="MAX_CONCURRENT_ANALYSES")
    analysis_queue_size: int = Field(default=100, env="ANALYSIS_QUEUE_SIZE")
    cache_enabled: bool = Field(default=True, env="CACHE_ENABLED")
    
    # 機械学習モデル設定
    model_cache_dir: str = Field(default="./models", env="MODEL_CACHE_DIR")
    model_update_interval: int = Field(default=86400, env="MODEL_UPDATE_INTERVAL")  # 24時間
    model_training_batch_size: int = Field(default=1000, env="MODEL_TRAINING_BATCH_SIZE")
    
    # インサイト生成設定
    insight_generation_mode: str = Field(default="comprehensive", env="INSIGHT_GENERATION_MODE")
    insight_languages: List[str] = Field(default=["ja", "en"], env="INSIGHT_LANGUAGES")
    insight_max_recommendations: int = Field(default=10, env="INSIGHT_MAX_RECOMMENDATIONS")
    
    # アラート設定
    alert_channels: List[str] = Field(
        default=["websocket", "email", "slack"],
        env="ALERT_CHANNELS"
    )
    alert_severity_levels: List[str] = Field(
        default=["low", "medium", "high", "critical"],
        env="ALERT_SEVERITY_LEVELS"
    )
    
    # 外部サービス連携設定
    slack_webhook_url: Optional[str] = Field(default=None, env="SLACK_WEBHOOK_URL")
    email_smtp_server: Optional[str] = Field(default=None, env="EMAIL_SMTP_SERVER")
    email_smtp_port: int = Field(default=587, env="EMAIL_SMTP_PORT")
    email_username: Optional[str] = Field(default=None, env="EMAIL_USERNAME")
    email_password: Optional[str] = Field(default=None, env="EMAIL_PASSWORD")
    
    # データ保持設定
    raw_data_retention_days: int = Field(default=90, env="RAW_DATA_RETENTION_DAYS")
    aggregated_data_retention_days: int = Field(default=730, env="AGGREGATED_DATA_RETENTION_DAYS")  # 2年
    insight_retention_days: int = Field(default=365, env="INSIGHT_RETENTION_DAYS")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
    def get_openai_config(self) -> Dict[str, Any]:
        """OpenAI設定を取得"""
        return {
            "api_key": self.openai_api_key,
            "model": self.openai_model,
            "max_tokens": self.openai_max_tokens,
            "temperature": self.openai_temperature
        }
    
    def get_database_config(self) -> Dict[str, Any]:
        """データベース設定を取得"""
        return {
            "url": self.database_url,
            "pool_size": self.database_pool_size,
            "max_overflow": self.database_max_overflow
        }
    
    def get_redis_config(self) -> Dict[str, Any]:
        """Redis設定を取得"""
        return {
            "url": self.redis_url,
            "cache_ttl": self.redis_cache_ttl
        }
    
    def get_celery_config(self) -> Dict[str, Any]:
        """Celery設定を取得"""
        return {
            "broker_url": self.celery_broker_url,
            "result_backend": self.celery_result_backend
        }
    
    def is_production(self) -> bool:
        """本番環境かどうかチェック"""
        return self.environment.lower() == "production"
    
    def is_development(self) -> bool:
        """開発環境かどうかチェック"""
        return self.environment.lower() == "development"

@lru_cache()
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを取得"""
    return Settings()

# 環境変数のサンプル
SAMPLE_ENV_CONTENT = """
# AI分析エンジン環境変数設定

# 基本設定
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-here

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3

# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/ai_analytics
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30

# Redis
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# 外部API
MAIN_BACKEND_URL=http://localhost:3001

# AI分析設定
AI_ANALYSIS_BATCH_SIZE=1000
AI_ANALYSIS_TIMEOUT=300
AI_CONFIDENCE_THRESHOLD=0.8

# 異常値検知
ANOMALY_SENSITIVITY=0.05
ANOMALY_WINDOW_SIZE=24

# リアルタイム処理
REALTIME_BATCH_SIZE=100
REALTIME_PROCESSING_INTERVAL=1.0

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]

# パフォーマンス
MAX_CONCURRENT_ANALYSES=10
ANALYSIS_QUEUE_SIZE=100
CACHE_ENABLED=true

# ログ
LOG_LEVEL=INFO
LOG_FILE=logs/ai-engine.log

# 外部サービス（オプション）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
"""

def create_sample_env_file():
    """サンプル.envファイルを作成"""
    with open(".env.sample", "w", encoding="utf-8") as f:
        f.write(SAMPLE_ENV_CONTENT)
    print("サンプル環境変数ファイル (.env.sample) を作成しました")

if __name__ == "__main__":
    create_sample_env_file()