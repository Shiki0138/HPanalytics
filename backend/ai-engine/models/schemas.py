"""
AI分析エンジンのデータスキーマ定義
"""
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

# ============ 基本的なEnum定義 ============

class AnalysisType(str, Enum):
    """分析タイプ"""
    COMPREHENSIVE = "comprehensive"
    ANOMALY_DETECTION = "anomaly_detection"
    TREND_ANALYSIS = "trend_analysis"
    BEHAVIOR_ANALYSIS = "behavior_analysis"
    REALTIME = "realtime"
    PREDICTIVE = "predictive"

class AlertSeverity(str, Enum):
    """アラートの重要度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InsightCategory(str, Enum):
    """インサイトカテゴリ"""
    PERFORMANCE = "performance"
    CONVERSION = "conversion"
    USER_EXPERIENCE = "user_experience"
    CONTENT = "content"
    TECHNICAL = "technical"
    COMPETITIVE = "competitive"

# ============ リクエストスキーマ ============

class DateRangeRequest(BaseModel):
    """日付範囲リクエスト"""
    start: datetime
    end: datetime
    
    @validator('end')
    def end_after_start(cls, v, values):
        if 'start' in values and v <= values['start']:
            raise ValueError('終了日は開始日より後である必要があります')
        return v

class AnalyticsRequest(BaseModel):
    """分析リクエスト"""
    site_id: str = Field(..., description="サイトID")
    analysis_types: List[AnalysisType] = Field(default=[AnalysisType.COMPREHENSIVE], description="分析タイプリスト")
    date_range: DateRangeRequest = Field(..., description="分析期間")
    metrics: Optional[List[str]] = Field(default=None, description="特定メトリクス指定")
    segments: Optional[List[str]] = Field(default=None, description="分析セグメント")
    include_predictions: bool = Field(default=True, description="予測分析を含むか")
    confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0, description="信頼度閾値")

class InsightRequest(BaseModel):
    """インサイト生成リクエスト"""
    site_id: str = Field(..., description="サイトID")
    analytics_data: Dict[str, Any] = Field(..., description="分析データ")
    focus_areas: Optional[List[InsightCategory]] = Field(default=None, description="フォーカス領域")
    language: str = Field(default="ja", description="言語コード")
    max_insights: int = Field(default=10, ge=1, le=50, description="最大インサイト数")
    include_actionables: bool = Field(default=True, description="実行可能項目を含むか")

class RealtimeAnalysisRequest(BaseModel):
    """リアルタイム分析リクエスト"""
    site_id: str = Field(..., description="サイトID")
    event_data: List[Dict[str, Any]] = Field(..., description="イベントデータ")
    analysis_type: str = Field(default="instant", description="分析タイプ")
    alert_thresholds: Optional[Dict[str, float]] = Field(default=None, description="アラート閾値")

# ============ レスポンススキーマ ============

class AnalyticsResponse(BaseModel):
    """分析結果レスポンス"""
    site_id: str = Field(..., description="サイトID")
    analysis_type: str = Field(..., description="分析タイプ")
    results: Dict[str, Any] = Field(..., description="分析結果")
    timestamp: datetime = Field(..., description="分析実行時刻")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="信頼度スコア")
    processing_time_ms: Optional[int] = Field(default=None, description="処理時間（ミリ秒）")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="メタデータ")

class InsightResponse(BaseModel):
    """インサイトレスポンス"""
    site_id: str = Field(..., description="サイトID")
    insights: List[Dict[str, Any]] = Field(..., description="インサイトリスト")
    timestamp: datetime = Field(..., description="生成時刻")
    actionable_items: List[Dict[str, Any]] = Field(..., description="実行可能項目")
    roi_predictions: Dict[str, Any] = Field(..., description="ROI予測")
    confidence_level: str = Field(..., description="信頼度レベル")
    total_insights: int = Field(..., description="総インサイト数")

class RealtimeAnalysisResponse(BaseModel):
    """リアルタイム分析レスポンス"""
    site_id: str = Field(..., description="サイトID")
    analysis_result: Dict[str, Any] = Field(..., description="分析結果")
    processing_time_ms: int = Field(..., description="処理時間（ミリ秒）")
    timestamp: datetime = Field(..., description="処理時刻")
    alerts_triggered: Optional[List[Dict[str, Any]]] = Field(default=None, description="発動したアラート")

class AnomalyDetectionResponse(BaseModel):
    """異常値検知レスポンス"""
    site_id: str = Field(..., description="サイトID")
    anomalies: List[Dict[str, Any]] = Field(..., description="検知された異常値")
    detection_period: Dict[str, datetime] = Field(..., description="検知期間")
    total_anomalies: int = Field(..., description="異常値総数")
    severity_breakdown: Dict[str, int] = Field(..., description="重要度別内訳")
    timestamp: datetime = Field(..., description="検知時刻")

class TrendAnalysisResponse(BaseModel):
    """トレンド分析レスポンス"""
    site_id: str = Field(..., description="サイトID")
    trends: Dict[str, Any] = Field(..., description="トレンド分析結果")
    predictions: Dict[str, Any] = Field(..., description="予測結果")
    seasonal_patterns: Dict[str, Any] = Field(..., description="季節パターン")
    growth_opportunities: List[Dict[str, Any]] = Field(..., description="成長機会")
    timestamp: datetime = Field(..., description="分析時刻")

class BehaviorAnalysisResponse(BaseModel):
    """行動分析レスポンス"""
    site_id: str = Field(..., description="サイトID")
    behavior_patterns: Dict[str, Any] = Field(..., description="行動パターン")
    user_journeys: List[Dict[str, Any]] = Field(..., description="ユーザージャーニー")
    conversion_funnels: Dict[str, Any] = Field(..., description="コンバージョンファネル")
    optimization_suggestions: List[Dict[str, Any]] = Field(..., description="最適化提案")
    timestamp: datetime = Field(..., description="分析時刻")

# ============ データモデル ============

class AnomalyData(BaseModel):
    """異常値データ"""
    metric_name: str = Field(..., description="メトリクス名")
    timestamp: datetime = Field(..., description="発生時刻")
    expected_value: float = Field(..., description="期待値")
    actual_value: float = Field(..., description="実際の値")
    deviation_score: float = Field(..., description="偏差スコア")
    severity: AlertSeverity = Field(..., description="重要度")
    confidence: float = Field(..., ge=0.0, le=1.0, description="信頼度")
    context: Optional[Dict[str, Any]] = Field(default=None, description="コンテキスト情報")

class TrendData(BaseModel):
    """トレンドデータ"""
    metric_name: str = Field(..., description="メトリクス名")
    period: str = Field(..., description="期間")
    direction: str = Field(..., description="トレンド方向")
    magnitude: float = Field(..., description="変化量")
    confidence: float = Field(..., ge=0.0, le=1.0, description="信頼度")
    seasonality: Optional[Dict[str, Any]] = Field(default=None, description="季節性情報")
    forecast: Optional[List[Dict[str, Any]]] = Field(default=None, description="予測データ")

class UserBehaviorPattern(BaseModel):
    """ユーザー行動パターン"""
    pattern_id: str = Field(..., description="パターンID")
    pattern_type: str = Field(..., description="パターンタイプ")
    frequency: int = Field(..., description="頻度")
    conversion_rate: float = Field(..., ge=0.0, le=1.0, description="コンバージョン率")
    avg_session_duration: float = Field(..., description="平均セッション時間")
    pages_per_session: float = Field(..., description="セッションあたりページ数")
    characteristics: Dict[str, Any] = Field(..., description="特徴")

class InsightData(BaseModel):
    """インサイトデータ"""
    insight_id: str = Field(..., description="インサイトID")
    category: InsightCategory = Field(..., description="カテゴリ")
    title: str = Field(..., description="タイトル")
    description: str = Field(..., description="説明")
    impact_score: float = Field(..., ge=0.0, le=10.0, description="影響度スコア")
    confidence: float = Field(..., ge=0.0, le=1.0, description="信頼度")
    actionable_recommendations: List[str] = Field(..., description="実行可能な推奨事項")
    expected_roi: Optional[float] = Field(default=None, description="期待ROI")
    implementation_difficulty: str = Field(..., description="実装難易度")
    supporting_data: Dict[str, Any] = Field(..., description="根拠データ")

class RealtimeMetrics(BaseModel):
    """リアルタイムメトリクス"""
    timestamp: datetime = Field(..., description="時刻")
    active_users: int = Field(..., description="アクティブユーザー数")
    page_views: int = Field(..., description="ページビュー数")
    conversion_rate: float = Field(..., ge=0.0, le=1.0, description="コンバージョン率")
    bounce_rate: float = Field(..., ge=0.0, le=1.0, description="直帰率")
    avg_session_duration: float = Field(..., description="平均セッション時間")
    top_pages: List[Dict[str, Any]] = Field(..., description="人気ページ")
    traffic_sources: Dict[str, int] = Field(..., description="トラフィックソース")

class AlertData(BaseModel):
    """アラートデータ"""
    alert_id: str = Field(..., description="アラートID")
    alert_type: str = Field(..., description="アラートタイプ")
    severity: AlertSeverity = Field(..., description="重要度")
    title: str = Field(..., description="タイトル")
    message: str = Field(..., description="メッセージ")
    triggered_at: datetime = Field(..., description="発動時刻")
    metric_name: str = Field(..., description="関連メトリクス")
    current_value: float = Field(..., description="現在値")
    threshold_value: float = Field(..., description="閾値")
    recommended_actions: List[str] = Field(..., description="推奨アクション")
    auto_resolved: bool = Field(default=False, description="自動解決済み")

# ============ WebSocketメッセージスキーマ ============

class WebSocketMessage(BaseModel):
    """WebSocketメッセージ基底クラス"""
    type: str = Field(..., description="メッセージタイプ")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="送信時刻")
    site_id: str = Field(..., description="サイトID")

class RealtimeDataMessage(WebSocketMessage):
    """リアルタイムデータメッセージ"""
    data: RealtimeMetrics = Field(..., description="リアルタイムメトリクス")
    
class AlertMessage(WebSocketMessage):
    """アラートメッセージ"""
    alert: AlertData = Field(..., description="アラートデータ")

class InsightMessage(WebSocketMessage):
    """インサイトメッセージ"""
    insights: List[InsightData] = Field(..., description="インサイトリスト")

class AnalysisCompleteMessage(WebSocketMessage):
    """分析完了メッセージ"""
    analysis_id: str = Field(..., description="分析ID")
    results: Dict[str, Any] = Field(..., description="分析結果")

# ============ 設定・ヘルスチェック ============

class HealthCheckResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str = Field(..., description="ステータス")
    services: Dict[str, bool] = Field(..., description="サービス状態")
    timestamp: datetime = Field(..., description="チェック時刻")
    version: str = Field(..., description="バージョン")
    uptime: float = Field(..., description="稼働時間")

class ServiceConfiguration(BaseModel):
    """サービス設定"""
    service_name: str = Field(..., description="サービス名")
    configuration: Dict[str, Any] = Field(..., description="設定値")
    last_updated: datetime = Field(..., description="最終更新時刻")
    
# ============ バリデーション拡張 ============

class AnalyticsMetrics(BaseModel):
    """分析メトリクス集合"""
    page_views: int = Field(..., ge=0)
    unique_visitors: int = Field(..., ge=0)
    session_duration: float = Field(..., ge=0)
    bounce_rate: float = Field(..., ge=0, le=1)
    conversion_rate: float = Field(..., ge=0, le=1)
    
    @validator('bounce_rate', 'conversion_rate')
    def validate_rates(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('率は0-1の範囲である必要があります')
        return v

class PredictionData(BaseModel):
    """予測データ"""
    metric_name: str = Field(..., description="メトリクス名")
    prediction_horizon: int = Field(..., ge=1, description="予測期間（日数）")
    predicted_values: List[float] = Field(..., description="予測値リスト")
    confidence_intervals: List[Dict[str, float]] = Field(..., description="信頼区間")
    model_accuracy: float = Field(..., ge=0, le=1, description="モデル精度")
    factors: List[str] = Field(..., description="影響要因")

# ============ エクスポート ============

__all__ = [
    # Enums
    "AnalysisType", "AlertSeverity", "InsightCategory",
    # Request schemas
    "DateRangeRequest", "AnalyticsRequest", "InsightRequest", "RealtimeAnalysisRequest",
    # Response schemas
    "AnalyticsResponse", "InsightResponse", "RealtimeAnalysisResponse", 
    "AnomalyDetectionResponse", "TrendAnalysisResponse", "BehaviorAnalysisResponse",
    # Data models
    "AnomalyData", "TrendData", "UserBehaviorPattern", "InsightData", 
    "RealtimeMetrics", "AlertData",
    # WebSocket messages
    "WebSocketMessage", "RealtimeDataMessage", "AlertMessage", 
    "InsightMessage", "AnalysisCompleteMessage",
    # Misc
    "HealthCheckResponse", "ServiceConfiguration", "AnalyticsMetrics", "PredictionData"
]