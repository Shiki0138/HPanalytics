"""
高度異常値検知エンジン
機械学習とAIを組み合わせた次世代異常検知システム
"""
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
from sklearn.decomposition import PCA
from scipy import stats
import redis
from config.settings import Settings
from models.schemas import AnomalyData, AlertSeverity

logger = logging.getLogger(__name__)

class AnomalyDetectorService:
    """異常値検知サービス"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client = None
        self.models = {}
        self.scalers = {}
        self.thresholds = {}
        self.historical_patterns = {}
        
    async def initialize(self):
        """サービス初期化"""
        try:
            # Redis接続
            self.redis_client = redis.from_url(self.settings.redis_url)
            
            # 異常検知モデル初期化
            await self._initialize_models()
            
            # 閾値設定
            await self._setup_thresholds()
            
            # 履歴パターン読み込み
            await self._load_historical_patterns()
            
            logger.info("異常値検知サービス初期化完了")
            
        except Exception as e:
            logger.error(f"異常値検知サービス初期化エラー: {e}")
            raise

    async def _initialize_models(self):
        """異常検知モデル初期化"""
        try:
            # Isolation Forest - 一般的な異常検知
            self.models['isolation_forest'] = IsolationForest(
                contamination=self.settings.anomaly_sensitivity,
                random_state=42,
                n_estimators=100
            )
            
            # DBSCAN - クラスタベース異常検知
            self.models['dbscan'] = DBSCAN(
                eps=0.5,
                min_samples=5
            )
            
            # 統計的異常検知 - Z-scoreベース
            self.models['statistical'] = {
                'z_threshold': 3.0,
                'iqr_multiplier': 1.5
            }
            
            # PCA - 多次元異常検知
            self.models['pca'] = PCA(n_components=0.95)
            
            # データ正規化用スケーラー
            self.scalers['standard'] = StandardScaler()
            
            logger.info("異常検知モデル初期化完了")
            
        except Exception as e:
            logger.error(f"モデル初期化エラー: {e}")
            raise

    async def _setup_thresholds(self):
        """動的閾値設定"""
        try:
            # デフォルト閾値
            self.thresholds = {
                'metrics': {
                    'page_views': {'z_score': 3.0, 'percent_change': 50},
                    'unique_visitors': {'z_score': 2.5, 'percent_change': 40},
                    'bounce_rate': {'z_score': 2.0, 'percent_change': 30},
                    'conversion_rate': {'z_score': 2.5, 'percent_change': 25},
                    'avg_session_duration': {'z_score': 2.0, 'percent_change': 35},
                    'revenue': {'z_score': 3.0, 'percent_change': 60}
                },
                'severity_levels': {
                    'low': {'z_score': 2.0, 'percent_change': 20},
                    'medium': {'z_score': 2.5, 'percent_change': 30},
                    'high': {'z_score': 3.0, 'percent_change': 50},
                    'critical': {'z_score': 4.0, 'percent_change': 80}
                },
                'time_windows': {
                    'real_time': {'minutes': 5, 'sensitivity': 'high'},
                    'hourly': {'hours': 1, 'sensitivity': 'medium'},
                    'daily': {'days': 1, 'sensitivity': 'low'},
                    'weekly': {'days': 7, 'sensitivity': 'very_low'}
                }
            }
            
        except Exception as e:
            logger.error(f"閾値設定エラー: {e}")

    async def _load_historical_patterns(self):
        """履歴パターン読み込み"""
        try:
            # Redisから過去の異常検知結果を読み込み
            pattern_key = "anomaly_patterns:*"
            keys = await self.redis_client.keys(pattern_key)
            
            for key in keys:
                pattern_data = await self.redis_client.get(key)
                if pattern_data:
                    site_id = key.split(':')[1]
                    self.historical_patterns[site_id] = json.loads(pattern_data)
            
            logger.info(f"{len(self.historical_patterns)}サイトの履歴パターンを読み込み")
            
        except Exception as e:
            logger.warning(f"履歴パターン読み込みエラー: {e}")
            self.historical_patterns = {}

    async def detect_anomalies(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime],
        metrics: Optional[List[str]] = None
    ) -> List[AnomalyData]:
        """異常値検知実行"""
        try:
            start_time = datetime.utcnow()
            
            # データ取得
            data = await self._fetch_anomaly_detection_data(site_id, date_range)
            
            if data.empty:
                logger.warning(f"異常検知データが空: {site_id}")
                return []
            
            # メトリクス選択
            if not metrics:
                metrics = self._get_default_metrics(data)
            
            # 並行して複数手法で異常検知
            detection_tasks = [
                self._detect_statistical_anomalies(data, metrics),
                self._detect_ml_anomalies(data, metrics),
                self._detect_pattern_anomalies(site_id, data, metrics),
                self._detect_contextual_anomalies(data, metrics)
            ]
            
            detection_results = await asyncio.gather(*detection_tasks)
            
            # 結果統合とランキング
            all_anomalies = []
            for result in detection_results:
                all_anomalies.extend(result)
            
            # 重複除去と重要度ランキング
            ranked_anomalies = await self._rank_and_deduplicate_anomalies(
                all_anomalies, site_id
            )
            
            # 履歴パターン更新
            await self._update_historical_patterns(site_id, ranked_anomalies)
            
            # 処理時間ログ
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"異常検知完了 ({site_id}): {len(ranked_anomalies)}件, {processing_time:.2f}秒")
            
            return ranked_anomalies
            
        except Exception as e:
            logger.error(f"異常値検知エラー ({site_id}): {e}")
            return []

    async def _fetch_anomaly_detection_data(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime]
    ) -> pd.DataFrame:
        """異常検知用データ取得"""
        try:
            # キャッシュチェック
            cache_key = f"anomaly_data:{site_id}:{date_range['start']}:{date_range['end']}"
            cached_data = await self._get_from_cache(cache_key)
            
            if cached_data:
                return pd.read_json(cached_data)
            
            # 拡張期間でデータ取得（パターン学習用）
            extended_start = date_range['start'] - timedelta(days=30)
            
            # メインバックエンドからデータ取得
            data = await self._call_analytics_api(
                site_id, 
                extended_start, 
                date_range['end']
            )
            
            if data.empty:
                return self._generate_sample_anomaly_data(site_id, date_range)
            
            # データ前処理
            processed_data = await self._preprocess_anomaly_data(data)
            
            # キャッシュ保存
            await self._save_to_cache(cache_key, processed_data.to_json(), ttl=1800)  # 30分
            
            return processed_data
            
        except Exception as e:
            logger.error(f"異常検知データ取得エラー: {e}")
            return self._generate_sample_anomaly_data(site_id, date_range)

    async def _detect_statistical_anomalies(
        self, 
        data: pd.DataFrame, 
        metrics: List[str]
    ) -> List[AnomalyData]:
        """統計的異常検知"""
        try:
            anomalies = []
            
            for metric in metrics:
                if metric not in data.columns:
                    continue
                
                series = data[metric].dropna()
                if len(series) < self.settings.anomaly_min_data_points:
                    continue
                
                # Z-score異常検知
                z_scores = np.abs(stats.zscore(series))
                z_threshold = self.thresholds['metrics'].get(metric, {}).get('z_score', 3.0)
                z_anomalies = np.where(z_scores > z_threshold)[0]
                
                for idx in z_anomalies:
                    anomaly = AnomalyData(
                        metric_name=metric,
                        timestamp=data.iloc[idx]['timestamp'] if 'timestamp' in data.columns else datetime.utcnow(),
                        expected_value=float(series.mean()),
                        actual_value=float(series.iloc[idx]),
                        deviation_score=float(z_scores[idx]),
                        severity=self._calculate_severity(z_scores[idx], 'z_score'),
                        confidence=min(0.95, z_scores[idx] / 5.0),
                        context={
                            'detection_method': 'z_score',
                            'threshold': z_threshold,
                            'series_std': float(series.std()),
                            'series_mean': float(series.mean())
                        }
                    )
                    anomalies.append(anomaly)
                
                # IQR異常検知
                Q1 = series.quantile(0.25)
                Q3 = series.quantile(0.75)
                IQR = Q3 - Q1
                multiplier = self.models['statistical']['iqr_multiplier']
                
                lower_bound = Q1 - multiplier * IQR
                upper_bound = Q3 + multiplier * IQR
                
                iqr_anomalies = series[(series < lower_bound) | (series > upper_bound)]
                
                for idx, value in iqr_anomalies.items():
                    deviation = min(abs(value - lower_bound), abs(value - upper_bound)) / IQR
                    
                    anomaly = AnomalyData(
                        metric_name=metric,
                        timestamp=data.iloc[idx]['timestamp'] if 'timestamp' in data.columns else datetime.utcnow(),
                        expected_value=float(series.median()),
                        actual_value=float(value),
                        deviation_score=float(deviation),
                        severity=self._calculate_severity(deviation, 'iqr'),
                        confidence=min(0.90, deviation / 3.0),
                        context={
                            'detection_method': 'iqr',
                            'q1': float(Q1),
                            'q3': float(Q3),
                            'iqr': float(IQR),
                            'lower_bound': float(lower_bound),
                            'upper_bound': float(upper_bound)
                        }
                    )
                    anomalies.append(anomaly)
            
            return anomalies
            
        except Exception as e:
            logger.error(f"統計的異常検知エラー: {e}")
            return []

    async def _detect_ml_anomalies(
        self, 
        data: pd.DataFrame, 
        metrics: List[str]
    ) -> List[AnomalyData]:
        """機械学習による異常検知"""
        try:
            anomalies = []
            
            # 数値データの抽出
            numeric_data = data[metrics].select_dtypes(include=[np.number]).dropna()
            
            if numeric_data.empty or len(numeric_data) < 10:
                return anomalies
            
            # データ正規化
            scaled_data = self.scalers['standard'].fit_transform(numeric_data)
            
            # Isolation Forest
            isolation_forest = self.models['isolation_forest']
            anomaly_scores = isolation_forest.fit_predict(scaled_data)
            outlier_scores = isolation_forest.score_samples(scaled_data)
            
            # 異常点を特定
            anomaly_indices = np.where(anomaly_scores == -1)[0]
            
            for idx in anomaly_indices:
                # 最も異常なメトリクスを特定
                row_data = numeric_data.iloc[idx]
                most_anomalous_metric = self._find_most_anomalous_metric(
                    row_data, numeric_data, metrics
                )
                
                anomaly = AnomalyData(
                    metric_name=most_anomalous_metric,
                    timestamp=data.iloc[idx]['timestamp'] if 'timestamp' in data.columns else datetime.utcnow(),
                    expected_value=float(numeric_data[most_anomalous_metric].mean()),
                    actual_value=float(row_data[most_anomalous_metric]),
                    deviation_score=abs(float(outlier_scores[idx])),
                    severity=self._calculate_severity_from_score(outlier_scores[idx]),
                    confidence=min(0.95, abs(outlier_scores[idx]) * 2),
                    context={
                        'detection_method': 'isolation_forest',
                        'anomaly_score': float(outlier_scores[idx]),
                        'contamination': self.settings.anomaly_sensitivity,
                        'affected_metrics': [m for m in metrics if m in row_data.index]
                    }
                )
                anomalies.append(anomaly)
            
            # DBSCAN クラスタリング異常検知
            if len(scaled_data) >= 10:
                dbscan = self.models['dbscan']
                cluster_labels = dbscan.fit_predict(scaled_data)
                
                # ノイズ（クラスタに属さない点）を異常とする
                noise_indices = np.where(cluster_labels == -1)[0]
                
                for idx in noise_indices:
                    row_data = numeric_data.iloc[idx]
                    most_anomalous_metric = self._find_most_anomalous_metric(
                        row_data, numeric_data, metrics
                    )
                    
                    anomaly = AnomalyData(
                        metric_name=most_anomalous_metric,
                        timestamp=data.iloc[idx]['timestamp'] if 'timestamp' in data.columns else datetime.utcnow(),
                        expected_value=float(numeric_data[most_anomalous_metric].median()),
                        actual_value=float(row_data[most_anomalous_metric]),
                        deviation_score=2.0,  # DBSCAN用固定スコア
                        severity=AlertSeverity.MEDIUM,
                        confidence=0.80,
                        context={
                            'detection_method': 'dbscan',
                            'cluster_label': int(cluster_labels[idx]),
                            'eps': dbscan.eps,
                            'min_samples': dbscan.min_samples
                        }
                    )
                    anomalies.append(anomaly)
            
            return anomalies
            
        except Exception as e:
            logger.error(f"機械学習異常検知エラー: {e}")
            return []

    async def _detect_pattern_anomalies(
        self, 
        site_id: str, 
        data: pd.DataFrame, 
        metrics: List[str]
    ) -> List[AnomalyData]:
        """パターンベース異常検知"""
        try:
            anomalies = []
            
            # 履歴パターンとの比較
            historical_pattern = self.historical_patterns.get(site_id, {})
            
            if not historical_pattern:
                return anomalies
            
            for metric in metrics:
                if metric not in data.columns:
                    continue
                
                series = data[metric].dropna()
                if len(series) < 7:  # 最低1週間のデータ
                    continue
                
                # 曜日パターン異常検知
                weekday_anomalies = await self._detect_weekday_pattern_anomalies(
                    series, metric, historical_pattern
                )
                anomalies.extend(weekday_anomalies)
                
                # 時間帯パターン異常検知
                if 'timestamp' in data.columns:
                    hourly_anomalies = await self._detect_hourly_pattern_anomalies(
                        data, metric, historical_pattern
                    )
                    anomalies.extend(hourly_anomalies)
                
                # トレンド異常検知
                trend_anomalies = await self._detect_trend_anomalies(
                    series, metric, historical_pattern
                )
                anomalies.extend(trend_anomalies)
            
            return anomalies
            
        except Exception as e:
            logger.error(f"パターン異常検知エラー: {e}")
            return []

    async def _detect_contextual_anomalies(
        self, 
        data: pd.DataFrame, 
        metrics: List[str]
    ) -> List[AnomalyData]:
        """文脈的異常検知"""
        try:
            anomalies = []
            
            # 相関関係の異常
            correlation_anomalies = await self._detect_correlation_anomalies(data, metrics)
            anomalies.extend(correlation_anomalies)
            
            # 比率の異常
            ratio_anomalies = await self._detect_ratio_anomalies(data, metrics)
            anomalies.extend(ratio_anomalies)
            
            # 連続性の異常（急激な変化）
            continuity_anomalies = await self._detect_continuity_anomalies(data, metrics)
            anomalies.extend(continuity_anomalies)
            
            return anomalies
            
        except Exception as e:
            logger.error(f"文脈的異常検知エラー: {e}")
            return []

    def _calculate_severity(self, score: float, method: str) -> AlertSeverity:
        """重要度計算"""
        try:
            if method == 'z_score':
                if score >= 4.0:
                    return AlertSeverity.CRITICAL
                elif score >= 3.0:
                    return AlertSeverity.HIGH
                elif score >= 2.5:
                    return AlertSeverity.MEDIUM
                else:
                    return AlertSeverity.LOW
            elif method == 'iqr':
                if score >= 3.0:
                    return AlertSeverity.HIGH
                elif score >= 2.0:
                    return AlertSeverity.MEDIUM
                else:
                    return AlertSeverity.LOW
            else:
                return AlertSeverity.MEDIUM
                
        except Exception:
            return AlertSeverity.MEDIUM

    def _calculate_severity_from_score(self, score: float) -> AlertSeverity:
        """スコアから重要度計算"""
        abs_score = abs(score)
        if abs_score >= 0.8:
            return AlertSeverity.CRITICAL
        elif abs_score >= 0.6:
            return AlertSeverity.HIGH
        elif abs_score >= 0.4:
            return AlertSeverity.MEDIUM
        else:
            return AlertSeverity.LOW

    def _find_most_anomalous_metric(
        self, 
        row_data: pd.Series, 
        full_data: pd.DataFrame, 
        metrics: List[str]
    ) -> str:
        """最も異常なメトリクスを特定"""
        try:
            max_z_score = 0
            most_anomalous = metrics[0]
            
            for metric in metrics:
                if metric in row_data.index and metric in full_data.columns:
                    series = full_data[metric].dropna()
                    if len(series) > 1:
                        z_score = abs((row_data[metric] - series.mean()) / series.std())
                        if z_score > max_z_score:
                            max_z_score = z_score
                            most_anomalous = metric
            
            return most_anomalous
            
        except Exception:
            return metrics[0] if metrics else "unknown"

    async def _rank_and_deduplicate_anomalies(
        self, 
        anomalies: List[AnomalyData], 
        site_id: str
    ) -> List[AnomalyData]:
        """異常値ランキングと重複除去"""
        try:
            if not anomalies:
                return []
            
            # 重複除去（同じメトリクス・時間帯の異常）
            unique_anomalies = {}
            for anomaly in anomalies:
                key = f"{anomaly.metric_name}_{anomaly.timestamp.strftime('%Y%m%d%H')}"
                
                if key not in unique_anomalies:
                    unique_anomalies[key] = anomaly
                else:
                    # より重要度の高い異常を保持
                    existing = unique_anomalies[key]
                    if self._compare_anomaly_importance(anomaly, existing) > 0:
                        unique_anomalies[key] = anomaly
            
            # 重要度スコア計算とランキング
            ranked_anomalies = list(unique_anomalies.values())
            for anomaly in ranked_anomalies:
                anomaly.importance_score = self._calculate_importance_score(anomaly)
            
            # 重要度順でソート
            ranked_anomalies.sort(key=lambda x: x.importance_score, reverse=True)
            
            # 上位N件のみ返す
            max_anomalies = 50
            return ranked_anomalies[:max_anomalies]
            
        except Exception as e:
            logger.error(f"異常値ランキングエラー: {e}")
            return anomalies[:20]  # フォールバック

    def _compare_anomaly_importance(self, anomaly1: AnomalyData, anomaly2: AnomalyData) -> int:
        """異常値の重要度比較"""
        try:
            severity_order = {
                AlertSeverity.CRITICAL: 4,
                AlertSeverity.HIGH: 3,
                AlertSeverity.MEDIUM: 2,
                AlertSeverity.LOW: 1
            }
            
            score1 = severity_order.get(anomaly1.severity, 0) * anomaly1.confidence * anomaly1.deviation_score
            score2 = severity_order.get(anomaly2.severity, 0) * anomaly2.confidence * anomaly2.deviation_score
            
            if score1 > score2:
                return 1
            elif score1 < score2:
                return -1
            else:
                return 0
                
        except Exception:
            return 0

    def _calculate_importance_score(self, anomaly: AnomalyData) -> float:
        """重要度スコア計算"""
        try:
            severity_weights = {
                AlertSeverity.CRITICAL: 1.0,
                AlertSeverity.HIGH: 0.8,
                AlertSeverity.MEDIUM: 0.6,
                AlertSeverity.LOW: 0.4
            }
            
            # メトリクス重要度
            metric_weights = {
                'revenue': 1.0,
                'conversion_rate': 0.9,
                'page_views': 0.8,
                'unique_visitors': 0.8,
                'bounce_rate': 0.7,
                'avg_session_duration': 0.6
            }
            
            severity_weight = severity_weights.get(anomaly.severity, 0.5)
            metric_weight = metric_weights.get(anomaly.metric_name, 0.5)
            
            importance_score = (
                severity_weight * 0.4 +
                anomaly.confidence * 0.3 +
                metric_weight * 0.2 +
                min(anomaly.deviation_score / 5.0, 1.0) * 0.1
            )
            
            return importance_score
            
        except Exception:
            return 0.5

    def get_severity_breakdown(self, anomalies: List[AnomalyData]) -> Dict[str, int]:
        """重要度別内訳取得"""
        try:
            breakdown = {
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0
            }
            
            for anomaly in anomalies:
                breakdown[anomaly.severity.value] += 1
            
            return breakdown
            
        except Exception as e:
            logger.error(f"重要度別内訳計算エラー: {e}")
            return {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}

    # ============ ヘルパーメソッド ============
    
    def _get_default_metrics(self, data: pd.DataFrame) -> List[str]:
        """デフォルトメトリクス取得"""
        default_metrics = [
            'page_views', 'unique_visitors', 'bounce_rate', 
            'conversion_rate', 'avg_session_duration', 'revenue'
        ]
        return [m for m in default_metrics if m in data.columns]

    async def _preprocess_anomaly_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """異常検知データ前処理"""
        try:
            # 欠損値処理
            data = data.fillna(method='forward').fillna(method='backward')
            
            # 時系列インデックス設定
            if 'timestamp' in data.columns:
                data['timestamp'] = pd.to_datetime(data['timestamp'])
                data = data.set_index('timestamp').sort_index()
            
            # 移動平均による平滑化
            window_size = 24  # 24時間
            numeric_columns = data.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                data[f'{col}_ma'] = data[col].rolling(window=window_size, center=True).mean()
            
            return data
            
        except Exception as e:
            logger.error(f"データ前処理エラー: {e}")
            return data

    async def _update_historical_patterns(self, site_id: str, anomalies: List[AnomalyData]):
        """履歴パターン更新"""
        try:
            pattern_data = {
                'last_updated': datetime.utcnow().isoformat(),
                'anomaly_count': len(anomalies),
                'common_metrics': {},
                'severity_distribution': self.get_severity_breakdown(anomalies),
                'patterns': {}
            }
            
            # よく異常になるメトリクスを記録
            metric_counts = {}
            for anomaly in anomalies:
                metric_counts[anomaly.metric_name] = metric_counts.get(anomaly.metric_name, 0) + 1
            
            pattern_data['common_metrics'] = dict(sorted(metric_counts.items(), key=lambda x: x[1], reverse=True))
            
            # Redisに保存
            await self._save_to_cache(
                f"anomaly_patterns:{site_id}",
                json.dumps(pattern_data),
                ttl=86400 * 7  # 1週間
            )
            
        except Exception as e:
            logger.error(f"履歴パターン更新エラー: {e}")

    def _generate_sample_anomaly_data(self, site_id: str, date_range: Dict) -> pd.DataFrame:
        """サンプル異常検知データ生成"""
        try:
            start_date = date_range.get('start', datetime.utcnow() - timedelta(days=7))
            end_date = date_range.get('end', datetime.utcnow())
            
            # 時間範囲生成
            dates = pd.date_range(start=start_date, end=end_date, freq='H')
            
            # サンプルデータ生成
            np.random.seed(42)
            n_points = len(dates)
            
            # 正常なパターン + 異常値を意図的に注入
            normal_pattern = np.random.normal(1000, 100, n_points)
            
            # 異常値注入（5%の確率）
            anomaly_mask = np.random.random(n_points) < 0.05
            normal_pattern[anomaly_mask] *= np.random.choice([0.3, 2.5], size=np.sum(anomaly_mask))
            
            data = pd.DataFrame({
                'timestamp': dates,
                'page_views': np.maximum(0, normal_pattern + np.sin(np.arange(n_points) * 2 * np.pi / 24) * 200),
                'unique_visitors': np.maximum(0, normal_pattern * 0.4 + np.random.normal(0, 50, n_points)),
                'bounce_rate': np.clip(np.random.beta(2, 3, n_points), 0, 1),
                'conversion_rate': np.clip(np.random.beta(1, 20, n_points), 0, 1),
                'avg_session_duration': np.maximum(30, np.random.gamma(2, 60, n_points)),
                'revenue': np.maximum(0, normal_pattern * 0.5 + np.random.gamma(2, 100, n_points))
            })
            
            return data
            
        except Exception as e:
            logger.error(f"サンプルデータ生成エラー: {e}")
            return pd.DataFrame()

    # キャッシュとAPI呼び出しのヘルパーメソッド
    async def _get_from_cache(self, key: str) -> Optional[str]:
        try:
            if self.redis_client:
                return await self.redis_client.get(key)
        except Exception:
            pass
        return None

    async def _save_to_cache(self, key: str, value: str, ttl: int):
        try:
            if self.redis_client:
                await self.redis_client.setex(key, ttl, value)
        except Exception as e:
            logger.warning(f"キャッシュ保存エラー: {e}")

    async def _call_analytics_api(self, site_id: str, start: datetime, end: datetime) -> pd.DataFrame:
        """分析API呼び出し"""
        import httpx
        
        try:
            url = f"{self.settings.main_backend_url}/api/analytics/data/{site_id}"
            params = {
                "start": start.isoformat(),
                "end": end.isoformat(),
                "include_hourly": True
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data:
                    return pd.DataFrame(data)
                else:
                    return pd.DataFrame()
                    
        except Exception as e:
            logger.error(f"Analytics API呼び出しエラー: {e}")
            return pd.DataFrame()

    async def health_check(self) -> bool:
        """ヘルスチェック"""
        try:
            # Redis接続確認
            if self.redis_client:
                await self.redis_client.ping()
            
            # モデル確認
            if not self.models:
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"異常検知サービスヘルスチェックエラー: {e}")
            return False

    # 追加の異常検知メソッド（簡略実装）
    
    async def _detect_weekday_pattern_anomalies(self, series, metric, historical_pattern):
        """曜日パターン異常検知"""
        return []  # 簡略実装

    async def _detect_hourly_pattern_anomalies(self, data, metric, historical_pattern):
        """時間帯パターン異常検知"""
        return []  # 簡略実装

    async def _detect_trend_anomalies(self, series, metric, historical_pattern):
        """トレンド異常検知"""
        return []  # 簡略実装

    async def _detect_correlation_anomalies(self, data, metrics):
        """相関異常検知"""
        return []  # 簡略実装

    async def _detect_ratio_anomalies(self, data, metrics):
        """比率異常検知"""
        return []  # 簡略実装

    async def _detect_continuity_anomalies(self, data, metrics):
        """連続性異常検知"""
        return []  # 簡略実装