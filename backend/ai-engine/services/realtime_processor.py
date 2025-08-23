"""
リアルタイムAI処理エンジン
ストリーミング分析、リアルタイム警告システム、予測的アラート
"""
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set
from collections import deque, defaultdict
import numpy as np
import pandas as pd
from dataclasses import dataclass, asdict
import redis
from config.settings import Settings
from models.schemas import RealtimeMetrics, AlertData, AlertSeverity

logger = logging.getLogger(__name__)

@dataclass
class RealtimeEvent:
    """リアルタイムイベント"""
    site_id: str
    event_type: str
    timestamp: datetime
    data: Dict[str, Any]
    user_id: Optional[str] = None
    session_id: Optional[str] = None

@dataclass
class StreamingWindow:
    """ストリーミングウィンドウ"""
    window_size: int
    events: deque
    metrics: Dict[str, float]
    last_update: datetime

class RealtimeProcessorService:
    """リアルタイム処理サービス"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client = None
        self.active_streams = {}  # site_id -> StreamingWindow
        self.alert_rules = {}
        self.alert_cooldowns = {}
        self.prediction_models = {}
        self.processing_queue = asyncio.Queue()
        self.worker_tasks = []
        self.is_running = False
        
    async def initialize(self):
        """サービス初期化"""
        try:
            # Redis接続
            self.redis_client = redis.from_url(self.settings.redis_url)
            
            # アラートルール設定
            await self._setup_alert_rules()
            
            # 予測モデル初期化
            await self._initialize_prediction_models()
            
            # ワーカータスク開始
            await self._start_workers()
            
            self.is_running = True
            logger.info("リアルタイム処理サービス初期化完了")
            
        except Exception as e:
            logger.error(f"リアルタイム処理サービス初期化エラー: {e}")
            raise

    async def _setup_alert_rules(self):
        """アラートルール設定"""
        try:
            self.alert_rules = {
                'traffic_spike': {
                    'metric': 'page_views_per_minute',
                    'threshold_multiplier': 3.0,  # 通常の3倍
                    'window_minutes': 5,
                    'severity': AlertSeverity.HIGH,
                    'cooldown_minutes': 30
                },
                'traffic_drop': {
                    'metric': 'page_views_per_minute',
                    'threshold_multiplier': 0.3,  # 通常の30%以下
                    'window_minutes': 10,
                    'severity': AlertSeverity.MEDIUM,
                    'cooldown_minutes': 15
                },
                'high_bounce_rate': {
                    'metric': 'bounce_rate',
                    'threshold': 0.8,  # 80%以上
                    'window_minutes': 15,
                    'severity': AlertSeverity.MEDIUM,
                    'cooldown_minutes': 30
                },
                'conversion_drop': {
                    'metric': 'conversion_rate',
                    'threshold_multiplier': 0.5,  # 通常の50%以下
                    'window_minutes': 30,
                    'severity': AlertSeverity.HIGH,
                    'cooldown_minutes': 60
                },
                'server_error_spike': {
                    'metric': 'error_rate',
                    'threshold': 0.05,  # 5%以上
                    'window_minutes': 5,
                    'severity': AlertSeverity.CRITICAL,
                    'cooldown_minutes': 10
                },
                'unusual_user_behavior': {
                    'metric': 'unusual_sessions_rate',
                    'threshold': 0.1,  # 10%以上
                    'window_minutes': 20,
                    'severity': AlertSeverity.MEDIUM,
                    'cooldown_minutes': 45
                }
            }
            
            logger.info(f"{len(self.alert_rules)}種類のアラートルールを設定")
            
        except Exception as e:
            logger.error(f"アラートルール設定エラー: {e}")

    async def _initialize_prediction_models(self):
        """予測モデル初期化"""
        try:
            # 簡単な移動平均ベースの予測
            self.prediction_models = {
                'moving_average': {
                    'window_size': 20,
                    'prediction_horizon': 5  # 5分先を予測
                },
                'exponential_smoothing': {
                    'alpha': 0.3,
                    'beta': 0.1,
                    'gamma': 0.1
                },
                'anomaly_detection': {
                    'sensitivity': 0.05,
                    'min_samples': 10
                }
            }
            
        except Exception as e:
            logger.error(f"予測モデル初期化エラー: {e}")

    async def _start_workers(self):
        """ワーカータスク開始"""
        try:
            # メインプロセッサ
            self.worker_tasks.append(
                asyncio.create_task(self._main_processor())
            )
            
            # アラートプロセッサ
            self.worker_tasks.append(
                asyncio.create_task(self._alert_processor())
            )
            
            # 予測プロセッサ
            self.worker_tasks.append(
                asyncio.create_task(self._prediction_processor())
            )
            
            # メトリクス集約プロセッサ
            self.worker_tasks.append(
                asyncio.create_task(self._metrics_aggregator())
            )
            
            logger.info(f"{len(self.worker_tasks)}個のワーカータスクを開始")
            
        except Exception as e:
            logger.error(f"ワーカータスク開始エラー: {e}")

    async def start_realtime_analysis(self, site_id: str, websocket_manager):
        """リアルタイム分析開始"""
        try:
            # ストリーミングウィンドウ初期化
            if site_id not in self.active_streams:
                self.active_streams[site_id] = StreamingWindow(
                    window_size=1000,  # 最新1000イベント
                    events=deque(maxlen=1000),
                    metrics=defaultdict(float),
                    last_update=datetime.utcnow()
                )
            
            # WebSocket管理オブジェクトを保存
            self.active_streams[site_id].websocket_manager = websocket_manager
            
            logger.info(f"リアルタイム分析開始: {site_id}")
            
        except Exception as e:
            logger.error(f"リアルタイム分析開始エラー ({site_id}): {e}")

    async def stop_realtime_analysis(self, site_id: str):
        """リアルタイム分析停止"""
        try:
            if site_id in self.active_streams:
                del self.active_streams[site_id]
            
            logger.info(f"リアルタイム分析停止: {site_id}")
            
        except Exception as e:
            logger.error(f"リアルタイム分析停止エラー ({site_id}): {e}")

    async def process_realtime_data(
        self, 
        site_id: str, 
        event_data: List[Dict[str, Any]], 
        analysis_type: str = "standard"
    ) -> Dict[str, Any]:
        """リアルタイムデータ処理"""
        try:
            start_time = datetime.utcnow()
            
            # イベント処理
            processed_events = []
            for event in event_data:
                realtime_event = RealtimeEvent(
                    site_id=site_id,
                    event_type=event.get('type', 'unknown'),
                    timestamp=datetime.fromisoformat(event.get('timestamp', datetime.utcnow().isoformat())),
                    data=event.get('data', {}),
                    user_id=event.get('user_id'),
                    session_id=event.get('session_id')
                )
                processed_events.append(realtime_event)
            
            # キューに追加
            for event in processed_events:
                await self.processing_queue.put(event)
            
            # 即座に基本メトリクス計算
            instant_metrics = await self._calculate_instant_metrics(site_id, processed_events)
            
            # 分析タイプに応じた処理
            analysis_result = await self._perform_analysis(
                site_id, processed_events, analysis_type
            )
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return {
                "processed_events": len(processed_events),
                "instant_metrics": instant_metrics,
                "analysis_result": analysis_result,
                "processing_time": processing_time,
                "timestamp": start_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"リアルタイムデータ処理エラー ({site_id}): {e}")
            return {"error": str(e)}

    async def quick_analysis(self, site_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """クイック分析"""
        try:
            # 現在のメトリクス取得
            current_metrics = await self._get_current_metrics(site_id)
            
            # トレンド分析
            trends = await self._analyze_short_term_trends(site_id)
            
            # アラート状況
            active_alerts = await self._get_active_alerts(site_id)
            
            return {
                "current_metrics": current_metrics,
                "trends": trends,
                "active_alerts": active_alerts,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"クイック分析エラー ({site_id}): {e}")
            return {"error": str(e)}

    async def subscribe_alerts(self, site_id: str, alert_types: List[str]):
        """アラート購読"""
        try:
            if site_id in self.active_streams:
                self.active_streams[site_id].subscribed_alerts = set(alert_types)
                logger.info(f"アラート購読設定 ({site_id}): {alert_types}")
            
        except Exception as e:
            logger.error(f"アラート購読エラー ({site_id}): {e}")

    async def configure_thresholds(self, site_id: str, thresholds: Dict[str, float]):
        """閾値設定"""
        try:
            # サイト固有の閾値設定
            custom_key = f"custom_thresholds:{site_id}"
            await self.redis_client.setex(
                custom_key,
                86400,  # 24時間
                json.dumps(thresholds)
            )
            
            logger.info(f"カスタム閾値設定 ({site_id}): {thresholds}")
            
        except Exception as e:
            logger.error(f"閾値設定エラー ({site_id}): {e}")

    async def _main_processor(self):
        """メインプロセッサ"""
        try:
            while self.is_running:
                try:
                    # イベント処理（バッチ処理）
                    events_batch = []
                    
                    # バッチサイズまで収集（最大待機時間付き）
                    try:
                        # 最初のイベントを待機
                        first_event = await asyncio.wait_for(
                            self.processing_queue.get(), 
                            timeout=1.0
                        )
                        events_batch.append(first_event)
                        
                        # 追加イベントを収集（ノンブロッキング）
                        for _ in range(self.settings.realtime_batch_size - 1):
                            try:
                                event = self.processing_queue.get_nowait()
                                events_batch.append(event)
                            except asyncio.QueueEmpty:
                                break
                                
                    except asyncio.TimeoutError:
                        # タイムアウト時は継続
                        continue
                    
                    if events_batch:
                        await self._process_events_batch(events_batch)
                    
                except Exception as e:
                    logger.error(f"メインプロセッサエラー: {e}")
                    await asyncio.sleep(1)
                    
        except asyncio.CancelledError:
            logger.info("メインプロセッサ停止")

    async def _alert_processor(self):
        """アラートプロセッサ"""
        try:
            while self.is_running:
                try:
                    # 全アクティブストリームをチェック
                    for site_id, stream in self.active_streams.items():
                        await self._check_alerts(site_id, stream)
                    
                    await asyncio.sleep(10)  # 10秒間隔
                    
                except Exception as e:
                    logger.error(f"アラートプロセッサエラー: {e}")
                    await asyncio.sleep(10)
                    
        except asyncio.CancelledError:
            logger.info("アラートプロセッサ停止")

    async def _prediction_processor(self):
        """予測プロセッサ"""
        try:
            while self.is_running:
                try:
                    # 予測計算
                    for site_id, stream in self.active_streams.items():
                        predictions = await self._generate_predictions(site_id, stream)
                        
                        if predictions and hasattr(stream, 'websocket_manager'):
                            await stream.websocket_manager.send_to_site(site_id, {
                                "type": "predictions",
                                "data": predictions,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                    
                    await asyncio.sleep(60)  # 1分間隔
                    
                except Exception as e:
                    logger.error(f"予測プロセッサエラー: {e}")
                    await asyncio.sleep(60)
                    
        except asyncio.CancelledError:
            logger.info("予測プロセッサ停止")

    async def _metrics_aggregator(self):
        """メトリクス集約プロセッサ"""
        try:
            while self.is_running:
                try:
                    # メトリクス集約
                    for site_id, stream in self.active_streams.items():
                        aggregated_metrics = await self._aggregate_metrics(site_id, stream)
                        
                        if aggregated_metrics and hasattr(stream, 'websocket_manager'):
                            await stream.websocket_manager.send_to_site(site_id, {
                                "type": "realtime_metrics",
                                "data": aggregated_metrics,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                    
                    await asyncio.sleep(self.settings.realtime_processing_interval)
                    
                except Exception as e:
                    logger.error(f"メトリクス集約エラー: {e}")
                    await asyncio.sleep(self.settings.realtime_processing_interval)
                    
        except asyncio.CancelledError:
            logger.info("メトリクス集約プロセッサ停止")

    async def _process_events_batch(self, events_batch: List[RealtimeEvent]):
        """イベントバッチ処理"""
        try:
            # サイト別にグループ化
            events_by_site = defaultdict(list)
            for event in events_batch:
                events_by_site[event.site_id].append(event)
            
            # サイト別処理
            for site_id, site_events in events_by_site.items():
                if site_id in self.active_streams:
                    stream = self.active_streams[site_id]
                    
                    # イベントをウィンドウに追加
                    for event in site_events:
                        stream.events.append(event)
                    
                    # メトリクス更新
                    await self._update_stream_metrics(stream, site_events)
                    
                    # 最終更新時刻更新
                    stream.last_update = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"イベントバッチ処理エラー: {e}")

    async def _update_stream_metrics(self, stream: StreamingWindow, events: List[RealtimeEvent]):
        """ストリームメトリクス更新"""
        try:
            current_time = datetime.utcnow()
            
            # 1分間のイベント数
            one_minute_ago = current_time - timedelta(minutes=1)
            recent_events = [e for e in stream.events if e.timestamp > one_minute_ago]
            
            # 基本メトリクス計算
            stream.metrics.update({
                'events_per_minute': len(recent_events),
                'page_views_per_minute': len([e for e in recent_events if e.event_type == 'page_view']),
                'unique_sessions': len(set(e.session_id for e in recent_events if e.session_id)),
                'active_users': len(set(e.user_id for e in recent_events if e.user_id))
            })
            
            # セッション関連メトリクス
            sessions_data = defaultdict(list)
            for event in recent_events:
                if event.session_id:
                    sessions_data[event.session_id].append(event)
            
            # 直帰率計算
            bounced_sessions = 0
            total_sessions = len(sessions_data)
            
            if total_sessions > 0:
                for session_events in sessions_data.values():
                    if len(session_events) == 1:
                        bounced_sessions += 1
                
                stream.metrics['bounce_rate'] = bounced_sessions / total_sessions
            
            # コンバージョン関連
            conversions = len([e for e in recent_events if e.event_type in ['purchase', 'signup', 'conversion']])
            stream.metrics['conversion_rate'] = conversions / max(len(recent_events), 1)
            
            # エラー率
            errors = len([e for e in recent_events if e.event_type == 'error' or e.data.get('is_error', False)])
            stream.metrics['error_rate'] = errors / max(len(recent_events), 1)
            
        except Exception as e:
            logger.error(f"ストリームメトリクス更新エラー: {e}")

    async def _check_alerts(self, site_id: str, stream: StreamingWindow):
        """アラートチェック"""
        try:
            current_time = datetime.utcnow()
            
            for rule_name, rule in self.alert_rules.items():
                # クールダウンチェック
                cooldown_key = f"{site_id}:{rule_name}"
                if cooldown_key in self.alert_cooldowns:
                    if current_time < self.alert_cooldowns[cooldown_key]:
                        continue
                
                # アラート条件チェック
                alert_triggered = await self._check_alert_condition(stream, rule)
                
                if alert_triggered:
                    # アラート生成
                    alert = await self._create_alert(site_id, rule_name, rule, stream)
                    
                    # アラート送信
                    await self._send_alert(site_id, alert, stream)
                    
                    # クールダウン設定
                    self.alert_cooldowns[cooldown_key] = current_time + timedelta(
                        minutes=rule.get('cooldown_minutes', 30)
                    )
            
        except Exception as e:
            logger.error(f"アラートチェックエラー ({site_id}): {e}")

    async def _check_alert_condition(self, stream: StreamingWindow, rule: Dict[str, Any]) -> bool:
        """アラート条件チェック"""
        try:
            metric_name = rule['metric']
            current_value = stream.metrics.get(metric_name, 0)
            
            if 'threshold' in rule:
                # 絶対閾値
                return current_value > rule['threshold']
            elif 'threshold_multiplier' in rule:
                # 相対閾値（履歴との比較）
                historical_avg = await self._get_historical_average(
                    stream, metric_name, rule.get('window_minutes', 60)
                )
                
                if historical_avg > 0:
                    multiplier = rule['threshold_multiplier']
                    if multiplier > 1:  # スパイク検知
                        return current_value > historical_avg * multiplier
                    else:  # ドロップ検知
                        return current_value < historical_avg * multiplier
            
            return False
            
        except Exception as e:
            logger.error(f"アラート条件チェックエラー: {e}")
            return False

    async def _get_historical_average(self, stream: StreamingWindow, metric: str, window_minutes: int) -> float:
        """履歴平均取得"""
        try:
            current_time = datetime.utcnow()
            window_start = current_time - timedelta(minutes=window_minutes)
            
            # 履歴イベントから計算（簡略実装）
            # 実際の実装では、Redisやデータベースから履歴データを取得
            relevant_events = [e for e in stream.events if e.timestamp > window_start]
            
            if not relevant_events:
                return 0
            
            # 簡単な平均計算
            if metric == 'page_views_per_minute':
                return len([e for e in relevant_events if e.event_type == 'page_view']) / window_minutes
            elif metric == 'error_rate':
                errors = len([e for e in relevant_events if e.event_type == 'error'])
                return errors / max(len(relevant_events), 1)
            
            return stream.metrics.get(metric, 0)
            
        except Exception as e:
            logger.error(f"履歴平均取得エラー: {e}")
            return 0

    async def _create_alert(self, site_id: str, rule_name: str, rule: Dict[str, Any], stream: StreamingWindow) -> AlertData:
        """アラート作成"""
        try:
            metric_name = rule['metric']
            current_value = stream.metrics.get(metric_name, 0)
            
            # アラートメッセージ生成
            messages = {
                'traffic_spike': f"トラフィックが急増しています ({current_value:.1f}/分)",
                'traffic_drop': f"トラフィックが大幅に減少しています ({current_value:.1f}/分)",
                'high_bounce_rate': f"直帰率が異常に高くなっています ({current_value:.1%})",
                'conversion_drop': f"コンバージョン率が大幅に低下しています ({current_value:.2%})",
                'server_error_spike': f"サーバーエラー率が急増しています ({current_value:.2%})",
                'unusual_user_behavior': f"異常なユーザー行動が検出されました"
            }
            
            # 推奨アクション
            recommended_actions = {
                'traffic_spike': ["サーバーリソースの確認", "CDNの状態確認", "スケーリング検討"],
                'traffic_drop': ["サイト稼働状況確認", "アクセス経路確認", "SEO状況チェック"],
                'high_bounce_rate': ["ページコンテンツ確認", "ページ読み込み速度確認", "ユーザビリティ改善"],
                'conversion_drop': ["決済システム確認", "フォーム動作確認", "ユーザーフロー見直し"],
                'server_error_spike': ["サーバーログ確認", "システム状態確認", "緊急対応実施"],
                'unusual_user_behavior': ["セキュリティ確認", "ボット活動チェック", "ユーザー行動分析"]
            }
            
            alert = AlertData(
                alert_id=f"alert_{site_id}_{rule_name}_{datetime.utcnow().timestamp()}",
                alert_type=rule_name,
                severity=rule['severity'],
                title=rule_name.replace('_', ' ').title(),
                message=messages.get(rule_name, f"{rule_name}アラートが発生しました"),
                triggered_at=datetime.utcnow(),
                metric_name=metric_name,
                current_value=current_value,
                threshold_value=rule.get('threshold', 0),
                recommended_actions=recommended_actions.get(rule_name, ["状況確認が必要です"]),
                auto_resolved=False
            )
            
            return alert
            
        except Exception as e:
            logger.error(f"アラート作成エラー: {e}")
            raise

    async def _send_alert(self, site_id: str, alert: AlertData, stream: StreamingWindow):
        """アラート送信"""
        try:
            # WebSocket経由で送信
            if hasattr(stream, 'websocket_manager'):
                await stream.websocket_manager.send_to_site(site_id, {
                    "type": "alert",
                    "data": asdict(alert),
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Redisにアラート履歴保存
            alert_key = f"alerts:{site_id}"
            alert_data = {
                **asdict(alert),
                "triggered_at": alert.triggered_at.isoformat()
            }
            
            await self.redis_client.lpush(alert_key, json.dumps(alert_data))
            await self.redis_client.ltrim(alert_key, 0, 99)  # 最新100件まで
            await self.redis_client.expire(alert_key, 86400 * 7)  # 1週間保持
            
            logger.info(f"アラート送信 ({site_id}): {alert.alert_type} - {alert.severity}")
            
        except Exception as e:
            logger.error(f"アラート送信エラー: {e}")

    # 以下、ヘルパーメソッド（簡略実装）
    
    async def _calculate_instant_metrics(self, site_id: str, events: List[RealtimeEvent]) -> Dict[str, Any]:
        """即座のメトリクス計算"""
        try:
            return {
                "events_processed": len(events),
                "unique_sessions": len(set(e.session_id for e in events if e.session_id)),
                "page_views": len([e for e in events if e.event_type == 'page_view']),
                "conversions": len([e for e in events if e.event_type in ['purchase', 'signup']]),
                "timestamp": datetime.utcnow().isoformat()
            }
        except:
            return {}

    async def _perform_analysis(self, site_id: str, events: List[RealtimeEvent], analysis_type: str) -> Dict[str, Any]:
        """分析実行"""
        if analysis_type == "anomaly_detection":
            return await self._detect_realtime_anomalies(events)
        elif analysis_type == "user_behavior":
            return await self._analyze_realtime_behavior(events)
        else:
            return {"analysis": "standard", "events_count": len(events)}

    async def _detect_realtime_anomalies(self, events: List[RealtimeEvent]) -> Dict[str, Any]:
        """リアルタイム異常検出"""
        return {"anomalies_detected": 0, "normal_patterns": len(events)}

    async def _analyze_realtime_behavior(self, events: List[RealtimeEvent]) -> Dict[str, Any]:
        """リアルタイム行動分析"""
        return {"behavior_patterns": [], "session_analysis": {}}

    async def _get_current_metrics(self, site_id: str) -> Dict[str, Any]:
        """現在のメトリクス取得"""
        if site_id in self.active_streams:
            return dict(self.active_streams[site_id].metrics)
        return {}

    async def _analyze_short_term_trends(self, site_id: str) -> Dict[str, str]:
        """短期トレンド分析"""
        return {"traffic": "stable", "engagement": "increasing", "conversion": "stable"}

    async def _get_active_alerts(self, site_id: str) -> List[Dict[str, Any]]:
        """アクティブアラート取得"""
        try:
            alert_key = f"alerts:{site_id}"
            alerts = await self.redis_client.lrange(alert_key, 0, 9)  # 最新10件
            
            active_alerts = []
            for alert_json in alerts:
                alert_data = json.loads(alert_json)
                # 過去1時間のアラートのみ
                alert_time = datetime.fromisoformat(alert_data['triggered_at'])
                if datetime.utcnow() - alert_time < timedelta(hours=1):
                    active_alerts.append(alert_data)
            
            return active_alerts
        except:
            return []

    async def _generate_predictions(self, site_id: str, stream: StreamingWindow) -> Dict[str, Any]:
        """予測生成"""
        try:
            if len(stream.events) < 10:
                return {}
            
            # 簡単な予測（移動平均ベース）
            recent_page_views = [
                len([e for e in stream.events if e.event_type == 'page_view' and 
                     e.timestamp > datetime.utcnow() - timedelta(minutes=i)])
                for i in range(1, 6)
            ]
            
            if recent_page_views:
                predicted_traffic = np.mean(recent_page_views) * 1.1  # 10%増加予測
                
                return {
                    "traffic_prediction": {
                        "next_5_minutes": predicted_traffic,
                        "confidence": 0.75,
                        "trend": "stable"
                    }
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"予測生成エラー: {e}")
            return {}

    async def _aggregate_metrics(self, site_id: str, stream: StreamingWindow) -> RealtimeMetrics:
        """メトリクス集約"""
        try:
            current_time = datetime.utcnow()
            
            return RealtimeMetrics(
                timestamp=current_time,
                active_users=int(stream.metrics.get('active_users', 0)),
                page_views=int(stream.metrics.get('page_views_per_minute', 0)),
                conversion_rate=float(stream.metrics.get('conversion_rate', 0)),
                bounce_rate=float(stream.metrics.get('bounce_rate', 0)),
                avg_session_duration=180.0,  # サンプル値
                top_pages=[{"page": "/", "views": 50}],  # サンプル値
                traffic_sources={"direct": 60, "search": 30, "social": 10}
            )
            
        except Exception as e:
            logger.error(f"メトリクス集約エラー: {e}")
            return None

    async def cleanup(self):
        """クリーンアップ"""
        try:
            self.is_running = False
            
            # ワーカータスク停止
            for task in self.worker_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            # ストリームクリア
            self.active_streams.clear()
            
            logger.info("リアルタイム処理サービスクリーンアップ完了")
            
        except Exception as e:
            logger.error(f"クリーンアップエラー: {e}")

    async def health_check(self) -> bool:
        """ヘルスチェック"""
        try:
            # Redis接続確認
            if self.redis_client:
                await self.redis_client.ping()
            
            # ワーカータスク状態確認
            active_workers = sum(1 for task in self.worker_tasks if not task.done())
            
            return self.is_running and active_workers > 0
            
        except Exception as e:
            logger.error(f"リアルタイム処理サービス ヘルスチェックエラー: {e}")
            return False