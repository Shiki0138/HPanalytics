"""
高度トレンド分析と予測エンジン
時系列分析、季節性検出、機械学習予測を統合した次世代トレンド分析
"""
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy import stats
from scipy.fft import fft, fftfreq
from scipy.signal import find_peaks
import redis
from config.settings import Settings
from models.schemas import TrendData

logger = logging.getLogger(__name__)

class TrendAnalyzerService:
    """トレンド分析サービス"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client = None
        self.prediction_models = {}
        self.seasonal_patterns = {}
        self.trend_cache = {}
        
    async def initialize(self):
        """サービス初期化"""
        try:
            # Redis接続
            self.redis_client = redis.from_url(self.settings.redis_url)
            
            # 予測モデル初期化
            await self._initialize_prediction_models()
            
            # 季節パターンキャッシュ読み込み
            await self._load_seasonal_patterns()
            
            logger.info("トレンド分析サービス初期化完了")
            
        except Exception as e:
            logger.error(f"トレンド分析サービス初期化エラー: {e}")
            raise

    async def _initialize_prediction_models(self):
        """予測モデル初期化"""
        try:
            # 線形回帰モデル（トレンド用）
            self.prediction_models['linear'] = LinearRegression()
            
            # ランダムフォレスト（非線形パターン用）
            self.prediction_models['random_forest'] = RandomForestRegressor(
                n_estimators=100,
                random_state=42,
                max_depth=10
            )
            
            # モデルパラメータ
            self.prediction_models['config'] = {
                'min_data_points': 14,  # 最低2週間のデータ
                'forecast_horizon': self.settings.trend_forecasting_days,
                'confidence_interval': self.settings.trend_confidence_interval
            }
            
            logger.info("予測モデル初期化完了")
            
        except Exception as e:
            logger.error(f"予測モデル初期化エラー: {e}")

    async def _load_seasonal_patterns(self):
        """季節パターンキャッシュ読み込み"""
        try:
            pattern_keys = await self.redis_client.keys("seasonal_patterns:*")
            
            for key in pattern_keys:
                pattern_data = await self.redis_client.get(key)
                if pattern_data:
                    site_id = key.split(':')[1]
                    self.seasonal_patterns[site_id] = json.loads(pattern_data)
            
            logger.info(f"{len(self.seasonal_patterns)}サイトの季節パターンを読み込み")
            
        except Exception as e:
            logger.warning(f"季節パターン読み込みエラー: {e}")
            self.seasonal_patterns = {}

    async def analyze_trends(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime],
        metrics: Optional[List[str]] = None
    ) -> Dict[str, TrendData]:
        """トレンド分析実行"""
        try:
            start_time = datetime.utcnow()
            
            # データ取得
            data = await self._fetch_trend_data(site_id, date_range)
            
            if data.empty:
                logger.warning(f"トレンドデータが空: {site_id}")
                return {}
            
            # メトリクス選択
            if not metrics:
                metrics = self._get_default_trend_metrics(data)
            
            # 並行してメトリクス別トレンド分析
            trend_tasks = []
            for metric in metrics:
                if metric in data.columns:
                    task = self._analyze_metric_trend(data, metric, site_id)
                    trend_tasks.append((metric, task))
            
            # 結果取得
            trend_results = {}
            for metric, task in trend_tasks:
                try:
                    trend_data = await task
                    trend_results[metric] = trend_data
                except Exception as e:
                    logger.error(f"メトリクス{metric}のトレンド分析エラー: {e}")
            
            # 処理時間ログ
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"トレンド分析完了 ({site_id}): {len(trend_results)}メトリクス, {processing_time:.2f}秒")
            
            return trend_results
            
        except Exception as e:
            logger.error(f"トレンド分析エラー ({site_id}): {e}")
            return {}

    async def comprehensive_trend_analysis(
        self, 
        site_id: str, 
        period: str = "30d"
    ) -> Dict[str, Any]:
        """包括的トレンド分析"""
        try:
            # 期間設定
            period_days = self._parse_period(period)
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_days)
            
            date_range = {"start": start_date, "end": end_date}
            
            # 並行分析実行
            analysis_tasks = [
                self.analyze_trends(site_id, date_range),
                self._analyze_seasonal_patterns(site_id, date_range),
                self._forecast_trends(site_id, date_range),
                self._identify_growth_opportunities(site_id, date_range),
                self._analyze_market_context(site_id, date_range)
            ]
            
            results = await asyncio.gather(*analysis_tasks)
            
            return {
                "trends": results[0],
                "seasonal_patterns": results[1],
                "predictions": results[2],
                "growth_opportunities": results[3],
                "market_context": results[4],
                "analysis_period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": period_days
                },
                "summary": await self._generate_trend_summary(results)
            }
            
        except Exception as e:
            logger.error(f"包括的トレンド分析エラー ({site_id}): {e}")
            return {"error": str(e)}

    async def _analyze_metric_trend(
        self, 
        data: pd.DataFrame, 
        metric: str, 
        site_id: str
    ) -> TrendData:
        """メトリクス別トレンド分析"""
        try:
            series = data[metric].dropna()
            
            if len(series) < self.prediction_models['config']['min_data_points']:
                return self._create_insufficient_data_trend(metric)
            
            # 基本統計
            basic_stats = self._calculate_basic_statistics(series)
            
            # トレンド方向と強度
            trend_analysis = await self._analyze_trend_direction(series)
            
            # 季節性検出
            seasonality = await self._detect_seasonality(series, metric)
            
            # 変動性分析
            volatility = self._analyze_volatility(series)
            
            # 予測生成
            forecast = await self._generate_forecast(series, metric, site_id)
            
            # サポート・レジスタンスレベル
            support_resistance = self._identify_support_resistance(series)
            
            return TrendData(
                metric_name=metric,
                period=f"{len(series)}d",
                direction=trend_analysis['direction'],
                magnitude=trend_analysis['magnitude'],
                confidence=trend_analysis['confidence'],
                seasonality=seasonality,
                forecast=forecast,
                statistics=basic_stats,
                volatility=volatility,
                support_resistance=support_resistance,
                trend_strength=trend_analysis['strength']
            )
            
        except Exception as e:
            logger.error(f"メトリクストレンド分析エラー ({metric}): {e}")
            return self._create_error_trend(metric, str(e))

    async def _analyze_trend_direction(self, series: pd.Series) -> Dict[str, Any]:
        """トレンド方向分析"""
        try:
            # 線形回帰による基本トレンド
            x = np.arange(len(series))
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, series)
            
            # トレンド方向決定
            if p_value < 0.05:  # 統計的有意
                if slope > 0:
                    direction = "increasing"
                elif slope < 0:
                    direction = "decreasing"
                else:
                    direction = "stable"
            else:
                direction = "stable"
            
            # トレンド強度（R²値ベース）
            r_squared = r_value ** 2
            if r_squared > 0.7:
                strength = "strong"
            elif r_squared > 0.4:
                strength = "moderate"
            else:
                strength = "weak"
            
            # 変化率計算
            if len(series) >= 2:
                first_value = series.iloc[0]
                last_value = series.iloc[-1]
                magnitude = ((last_value - first_value) / first_value * 100) if first_value != 0 else 0
            else:
                magnitude = 0
            
            # 信頼度計算
            confidence = min(0.95, max(0.1, r_squared * (1 - p_value)))
            
            return {
                "direction": direction,
                "magnitude": float(magnitude),
                "strength": strength,
                "confidence": float(confidence),
                "slope": float(slope),
                "r_squared": float(r_squared),
                "p_value": float(p_value)
            }
            
        except Exception as e:
            logger.error(f"トレンド方向分析エラー: {e}")
            return {
                "direction": "unknown",
                "magnitude": 0.0,
                "strength": "weak",
                "confidence": 0.1
            }

    async def _detect_seasonality(self, series: pd.Series, metric: str) -> Dict[str, Any]:
        """季節性検出"""
        try:
            seasonality_info = {"detected": False}
            
            if len(series) < 14:  # 最低2週間必要
                return seasonality_info
            
            # FFTによる周期性検出
            fft_values = fft(series.values)
            frequencies = fftfreq(len(series))
            
            # 正の周波数のみ使用
            positive_freq_idx = frequencies > 0
            positive_freqs = frequencies[positive_freq_idx]
            positive_magnitudes = np.abs(fft_values[positive_freq_idx])
            
            # ピーク検出
            peaks, _ = find_peaks(positive_magnitudes, height=np.max(positive_magnitudes) * 0.3)
            
            if len(peaks) > 0:
                # 最も強い周期を特定
                strongest_peak_idx = peaks[np.argmax(positive_magnitudes[peaks])]
                dominant_freq = positive_freqs[strongest_peak_idx]
                dominant_period = 1 / dominant_freq if dominant_freq != 0 else 0
                
                # 周期の解釈
                if 6 <= dominant_period <= 8:
                    pattern_type = "weekly"
                elif 28 <= dominant_period <= 32:
                    pattern_type = "monthly"
                elif 90 <= dominant_period <= 95:
                    pattern_type = "quarterly"
                elif 360 <= dominant_period <= 370:
                    pattern_type = "yearly"
                else:
                    pattern_type = "custom"
                
                seasonality_info.update({
                    "detected": True,
                    "dominant_period": float(dominant_period),
                    "pattern_type": pattern_type,
                    "strength": float(positive_magnitudes[strongest_peak_idx] / np.max(positive_magnitudes)),
                    "all_periods": [float(1/positive_freqs[p]) for p in peaks if positive_freqs[p] != 0]
                })
            
            # 自己相関による週次パターン確認
            if len(series) >= 14:
                weekly_correlation = series.autocorr(lag=7) if len(series) > 7 else 0
                if weekly_correlation > 0.5:
                    seasonality_info.update({
                        "weekly_pattern": True,
                        "weekly_correlation": float(weekly_correlation)
                    })
            
            return seasonality_info
            
        except Exception as e:
            logger.error(f"季節性検出エラー ({metric}): {e}")
            return {"detected": False, "error": str(e)}

    def _analyze_volatility(self, series: pd.Series) -> Dict[str, Any]:
        """変動性分析"""
        try:
            # 基本的な変動指標
            volatility_metrics = {
                "standard_deviation": float(series.std()),
                "coefficient_of_variation": float(series.std() / series.mean()) if series.mean() != 0 else 0,
                "range": float(series.max() - series.min()),
                "iqr": float(series.quantile(0.75) - series.quantile(0.25))
            }
            
            # 移動変動性（Rolling Volatility）
            if len(series) >= 7:
                rolling_std = series.rolling(window=7).std()
                volatility_metrics.update({
                    "rolling_volatility_mean": float(rolling_std.mean()),
                    "rolling_volatility_trend": "increasing" if rolling_std.iloc[-1] > rolling_std.iloc[0] else "decreasing"
                })
            
            # 変動性レベルの分類
            cv = volatility_metrics["coefficient_of_variation"]
            if cv < 0.1:
                volatility_level = "low"
            elif cv < 0.3:
                volatility_level = "moderate"
            elif cv < 0.5:
                volatility_level = "high"
            else:
                volatility_level = "very_high"
            
            volatility_metrics["volatility_level"] = volatility_level
            
            return volatility_metrics
            
        except Exception as e:
            logger.error(f"変動性分析エラー: {e}")
            return {"volatility_level": "unknown", "error": str(e)}

    async def _generate_forecast(
        self, 
        series: pd.Series, 
        metric: str, 
        site_id: str
    ) -> List[Dict[str, Any]]:
        """予測生成"""
        try:
            if len(series) < self.prediction_models['config']['min_data_points']:
                return []
            
            # 特徴量準備
            X, y = self._prepare_forecast_features(series)
            
            if len(X) == 0:
                return []
            
            # モデル選択と学習
            model = self.prediction_models['random_forest']
            model.fit(X, y)
            
            # 予測実行
            forecast_horizon = self.prediction_models['config']['forecast_horizon']
            forecasts = []
            
            # 予測期間分の特徴量生成
            last_index = len(series)
            for i in range(1, forecast_horizon + 1):
                future_features = self._generate_future_features(series, last_index + i)
                
                if len(future_features) > 0:
                    prediction = model.predict([future_features])[0]
                    
                    # 信頼区間計算（簡単な方法）
                    # 実際の実装では、より高度な信頼区間推定を使用
                    prediction_std = series.std() * 0.1  # 簡易実装
                    
                    forecast_date = series.index[-1] + timedelta(days=i) if hasattr(series.index, 'to_pydatetime') else datetime.utcnow() + timedelta(days=i)
                    
                    forecasts.append({
                        "date": forecast_date.isoformat() if hasattr(forecast_date, 'isoformat') else str(forecast_date),
                        "predicted_value": float(prediction),
                        "confidence_lower": float(prediction - 1.96 * prediction_std),
                        "confidence_upper": float(prediction + 1.96 * prediction_std),
                        "confidence_level": self.prediction_models['config']['confidence_interval']
                    })
            
            return forecasts
            
        except Exception as e:
            logger.error(f"予測生成エラー ({metric}): {e}")
            return []

    def _prepare_forecast_features(self, series: pd.Series) -> Tuple[np.ndarray, np.ndarray]:
        """予測用特徴量準備"""
        try:
            if len(series) < 7:
                return np.array([]), np.array([])
            
            features = []
            targets = []
            
            # ラグ特徴量と移動平均特徴量を使用
            for i in range(7, len(series)):
                feature_vector = [
                    series.iloc[i-1],  # 前日
                    series.iloc[i-7],  # 1週間前
                    series.iloc[i-7:i].mean(),  # 過去7日平均
                    series.iloc[i-3:i].mean(),  # 過去3日平均
                    i,  # トレンド項
                    i % 7,  # 曜日効果
                ]
                
                features.append(feature_vector)
                targets.append(series.iloc[i])
            
            return np.array(features), np.array(targets)
            
        except Exception as e:
            logger.error(f"特徴量準備エラー: {e}")
            return np.array([]), np.array([])

    def _generate_future_features(self, series: pd.Series, future_index: int) -> List[float]:
        """未来特徴量生成"""
        try:
            if len(series) < 7:
                return []
            
            return [
                series.iloc[-1],  # 最新値
                series.iloc[-7] if len(series) >= 7 else series.iloc[0],  # 1週間前
                series.iloc[-7:].mean() if len(series) >= 7 else series.mean(),  # 過去7日平均
                series.iloc[-3:].mean(),  # 過去3日平均
                future_index,  # トレンド項
                future_index % 7,  # 曜日効果
            ]
            
        except Exception:
            return []

    def _identify_support_resistance(self, series: pd.Series) -> Dict[str, Any]:
        """サポート・レジスタンスレベル識別"""
        try:
            if len(series) < 10:
                return {"support_levels": [], "resistance_levels": []}
            
            # ローカルミニマ（サポート）とマキシマ（レジスタンス）を検出
            from scipy.signal import argrelextrema
            
            # ローカルミニマ（サポートレベル）
            local_minima = argrelextrema(series.values, np.less, order=3)[0]
            support_levels = [float(series.iloc[i]) for i in local_minima]
            
            # ローカルマキシマ（レジスタンスレベル）
            local_maxima = argrelextrema(series.values, np.greater, order=3)[0]
            resistance_levels = [float(series.iloc[i]) for i in local_maxima]
            
            # 重要なレベルのみ抽出（出現頻度ベース）
            support_levels = self._filter_significant_levels(support_levels, series)
            resistance_levels = self._filter_significant_levels(resistance_levels, series)
            
            return {
                "support_levels": sorted(support_levels),
                "resistance_levels": sorted(resistance_levels, reverse=True),
                "current_position": self._analyze_current_position(series.iloc[-1], support_levels, resistance_levels)
            }
            
        except Exception as e:
            logger.error(f"サポート・レジスタンス識別エラー: {e}")
            return {"support_levels": [], "resistance_levels": []}

    def _filter_significant_levels(self, levels: List[float], series: pd.Series) -> List[float]:
        """重要なレベルのみフィルタリング"""
        try:
            if not levels:
                return []
            
            # レベル周辺での価格滞在回数をカウント
            significant_levels = []
            tolerance = series.std() * 0.1  # 許容範囲
            
            for level in levels:
                nearby_count = sum(1 for value in series if abs(value - level) <= tolerance)
                if nearby_count >= 2:  # 2回以上近づいた場合のみ
                    significant_levels.append(level)
            
            return significant_levels[:5]  # 最大5個まで
            
        except Exception:
            return levels[:5]

    def _analyze_current_position(
        self, 
        current_value: float, 
        support_levels: List[float], 
        resistance_levels: List[float]
    ) -> str:
        """現在の位置分析"""
        try:
            nearest_support = max(support_levels) if support_levels else None
            nearest_resistance = min(resistance_levels) if resistance_levels else None
            
            if nearest_support and nearest_resistance:
                if current_value < nearest_support:
                    return "below_support"
                elif current_value > nearest_resistance:
                    return "above_resistance"
                else:
                    return "between_levels"
            elif nearest_support and current_value < nearest_support:
                return "below_support"
            elif nearest_resistance and current_value > nearest_resistance:
                return "above_resistance"
            else:
                return "neutral"
                
        except Exception:
            return "unknown"

    async def _analyze_seasonal_patterns(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime]
    ) -> Dict[str, Any]:
        """季節パターン分析"""
        try:
            # 長期データ取得（季節性検出用）
            extended_start = date_range['start'] - timedelta(days=365)
            extended_range = {"start": extended_start, "end": date_range['end']}
            
            data = await self._fetch_trend_data(site_id, extended_range)
            
            if data.empty:
                return {"patterns_detected": False}
            
            patterns = {}
            metrics = self._get_default_trend_metrics(data)
            
            for metric in metrics:
                if metric in data.columns:
                    series = data[metric].dropna()
                    
                    # 曜日パターン
                    if hasattr(series.index, 'dayofweek'):
                        weekday_pattern = series.groupby(series.index.dayofweek).mean().to_dict()
                        patterns[f"{metric}_weekday"] = weekday_pattern
                    
                    # 月次パターン
                    if hasattr(series.index, 'month'):
                        monthly_pattern = series.groupby(series.index.month).mean().to_dict()
                        patterns[f"{metric}_monthly"] = monthly_pattern
                    
                    # 時間帯パターン（時間別データがある場合）
                    if hasattr(series.index, 'hour'):
                        hourly_pattern = series.groupby(series.index.hour).mean().to_dict()
                        patterns[f"{metric}_hourly"] = hourly_pattern
            
            # パターンをキャッシュに保存
            if patterns:
                await self._save_seasonal_patterns(site_id, patterns)
            
            return {
                "patterns_detected": len(patterns) > 0,
                "patterns": patterns,
                "analysis_period": extended_range
            }
            
        except Exception as e:
            logger.error(f"季節パターン分析エラー ({site_id}): {e}")
            return {"patterns_detected": False, "error": str(e)}

    async def _forecast_trends(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime]
    ) -> Dict[str, Any]:
        """トレンド予測"""
        try:
            data = await self._fetch_trend_data(site_id, date_range)
            
            if data.empty:
                return {"forecasts": {}}
            
            forecasts = {}
            metrics = self._get_default_trend_metrics(data)
            
            for metric in metrics:
                if metric in data.columns:
                    series = data[metric].dropna()
                    forecast = await self._generate_forecast(series, metric, site_id)
                    
                    if forecast:
                        forecasts[metric] = {
                            "short_term": forecast[:7],  # 1週間
                            "medium_term": forecast[:30],  # 1ヶ月
                            "long_term": forecast  # 全期間
                        }
            
            return {"forecasts": forecasts}
            
        except Exception as e:
            logger.error(f"トレンド予測エラー ({site_id}): {e}")
            return {"forecasts": {}, "error": str(e)}

    async def _identify_growth_opportunities(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime]
    ) -> List[Dict[str, Any]]:
        """成長機会識別"""
        try:
            trend_data = await self.analyze_trends(site_id, date_range)
            opportunities = []
            
            for metric, trend in trend_data.items():
                # 上昇トレンドで信頼度が高いメトリクス
                if trend.direction == "increasing" and trend.confidence > 0.7:
                    opportunities.append({
                        "type": "momentum",
                        "metric": metric,
                        "description": f"{metric}が強い上昇トレンドを示しています",
                        "potential_impact": "high",
                        "confidence": trend.confidence,
                        "recommended_action": f"{metric}の成長を加速させる施策を実行"
                    })
                
                # 下降トレンドは改善機会
                elif trend.direction == "decreasing" and trend.confidence > 0.6:
                    opportunities.append({
                        "type": "improvement",
                        "metric": metric,
                        "description": f"{metric}が下降傾向にあります",
                        "potential_impact": "medium",
                        "confidence": trend.confidence,
                        "recommended_action": f"{metric}の改善施策が必要"
                    })
                
                # 季節性がある場合
                if trend.seasonality and trend.seasonality.get("detected", False):
                    opportunities.append({
                        "type": "seasonal",
                        "metric": metric,
                        "description": f"{metric}に季節性パターンが検出されました",
                        "potential_impact": "medium",
                        "confidence": 0.8,
                        "recommended_action": "季節性を活用したキャンペーン実施"
                    })
            
            return opportunities[:10]  # 最大10件
            
        except Exception as e:
            logger.error(f"成長機会識別エラー ({site_id}): {e}")
            return []

    async def _analyze_market_context(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime]
    ) -> Dict[str, Any]:
        """市場コンテキスト分析"""
        try:
            # 業界ベンチマークとの比較（簡略実装）
            return {
                "industry_comparison": {
                    "position": "above_average",
                    "percentile": 65
                },
                "market_conditions": {
                    "trend": "growing",
                    "volatility": "moderate"
                },
                "competitive_landscape": {
                    "pressure": "medium",
                    "opportunities": ["mobile_optimization", "content_marketing"]
                }
            }
            
        except Exception as e:
            logger.error(f"市場コンテキスト分析エラー ({site_id}): {e}")
            return {}

    async def _generate_trend_summary(self, analysis_results: List[Any]) -> Dict[str, Any]:
        """トレンドサマリー生成"""
        try:
            trends = analysis_results[0] if len(analysis_results) > 0 else {}
            
            summary = {
                "total_metrics_analyzed": len(trends),
                "positive_trends": 0,
                "negative_trends": 0,
                "stable_trends": 0,
                "high_confidence_trends": 0
            }
            
            for trend in trends.values():
                if trend.direction == "increasing":
                    summary["positive_trends"] += 1
                elif trend.direction == "decreasing":
                    summary["negative_trends"] += 1
                else:
                    summary["stable_trends"] += 1
                
                if trend.confidence > 0.8:
                    summary["high_confidence_trends"] += 1
            
            # 全体的な健康スコア計算
            if summary["total_metrics_analyzed"] > 0:
                health_score = (
                    summary["positive_trends"] * 2 + 
                    summary["stable_trends"] * 1 - 
                    summary["negative_trends"] * 1
                ) / summary["total_metrics_analyzed"]
                summary["overall_health_score"] = max(0, min(10, health_score * 5))
            else:
                summary["overall_health_score"] = 5
            
            return summary
            
        except Exception as e:
            logger.error(f"トレンドサマリー生成エラー: {e}")
            return {"total_metrics_analyzed": 0}

    # ヘルパーメソッド
    
    def _parse_period(self, period: str) -> int:
        """期間文字列をパース"""
        try:
            if period.endswith('d'):
                return int(period[:-1])
            elif period.endswith('w'):
                return int(period[:-1]) * 7
            elif period.endswith('m'):
                return int(period[:-1]) * 30
            elif period.endswith('y'):
                return int(period[:-1]) * 365
            else:
                return int(period)
        except:
            return 30  # デフォルト30日

    def _get_default_trend_metrics(self, data: pd.DataFrame) -> List[str]:
        """デフォルトトレンドメトリクス取得"""
        default_metrics = [
            'page_views', 'unique_visitors', 'bounce_rate',
            'conversion_rate', 'avg_session_duration', 'revenue'
        ]
        return [m for m in default_metrics if m in data.columns]

    def _calculate_basic_statistics(self, series: pd.Series) -> Dict[str, float]:
        """基本統計計算"""
        try:
            return {
                "mean": float(series.mean()),
                "median": float(series.median()),
                "std": float(series.std()),
                "min": float(series.min()),
                "max": float(series.max()),
                "skewness": float(series.skew()),
                "kurtosis": float(series.kurtosis())
            }
        except:
            return {}

    def _create_insufficient_data_trend(self, metric: str) -> TrendData:
        """データ不足時のデフォルトトレンド"""
        return TrendData(
            metric_name=metric,
            period="0d",
            direction="unknown",
            magnitude=0.0,
            confidence=0.0,
            seasonality={"detected": False},
            forecast=[]
        )

    def _create_error_trend(self, metric: str, error: str) -> TrendData:
        """エラー時のデフォルトトレンド"""
        return TrendData(
            metric_name=metric,
            period="error",
            direction="error",
            magnitude=0.0,
            confidence=0.0,
            seasonality={"detected": False, "error": error},
            forecast=[]
        )

    async def _save_seasonal_patterns(self, site_id: str, patterns: Dict[str, Any]):
        """季節パターン保存"""
        try:
            pattern_data = {
                "patterns": patterns,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            cache_key = f"seasonal_patterns:{site_id}"
            await self.redis_client.setex(
                cache_key, 
                86400 * 30,  # 30日間保持
                json.dumps(pattern_data)
            )
            
        except Exception as e:
            logger.error(f"季節パターン保存エラー: {e}")

    async def _fetch_trend_data(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime]
    ) -> pd.DataFrame:
        """トレンドデータ取得"""
        # AI分析サービスと同様の実装
        # 簡略化のためサンプルデータを返す
        try:
            start_date = date_range['start']
            end_date = date_range['end']
            
            dates = pd.date_range(start=start_date, end=end_date, freq='D')
            
            # サンプルデータ生成
            np.random.seed(42)
            n_points = len(dates)
            
            # トレンドとノイズを含むデータ
            trend = np.linspace(1000, 1200, n_points)  # 上昇トレンド
            seasonal = 100 * np.sin(2 * np.pi * np.arange(n_points) / 7)  # 週次季節性
            noise = np.random.normal(0, 50, n_points)
            
            data = pd.DataFrame({
                'timestamp': dates,
                'page_views': trend + seasonal + noise,
                'unique_visitors': (trend + seasonal + noise) * 0.4,
                'bounce_rate': np.clip(0.6 + np.random.normal(0, 0.1, n_points), 0, 1),
                'conversion_rate': np.clip(0.03 + np.random.normal(0, 0.005, n_points), 0, 1),
                'avg_session_duration': 180 + np.random.normal(0, 30, n_points),
                'revenue': (trend + seasonal + noise) * 0.8
            })
            
            data = data.set_index('timestamp')
            return data
            
        except Exception as e:
            logger.error(f"トレンドデータ取得エラー: {e}")
            return pd.DataFrame()

    async def health_check(self) -> bool:
        """ヘルスチェック"""
        try:
            # Redis接続確認
            if self.redis_client:
                await self.redis_client.ping()
            
            # モデル確認
            if not self.prediction_models:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"トレンド分析サービスヘルスチェックエラー: {e}")
            return False