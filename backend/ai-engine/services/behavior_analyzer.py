"""
ユーザー行動パターン解析エンジン
機械学習クラスタリング、ファネル分析、セッション解析を統合
"""
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
import redis
from config.settings import Settings
from models.schemas import UserBehaviorPattern

logger = logging.getLogger(__name__)

class BehaviorAnalyzerService:
    """ユーザー行動分析サービス"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client = None
        self.clustering_models = {}
        self.user_segments = {}
        self.journey_patterns = {}
        self.funnel_configs = {}
        
    async def initialize(self):
        """サービス初期化"""
        try:
            # Redis接続
            self.redis_client = redis.from_url(self.settings.redis_url)
            
            # クラスタリングモデル初期化
            await self._initialize_clustering_models()
            
            # ファネル設定
            await self._setup_funnel_configurations()
            
            # 既存セグメント読み込み
            await self._load_existing_segments()
            
            logger.info("ユーザー行動分析サービス初期化完了")
            
        except Exception as e:
            logger.error(f"ユーザー行動分析サービス初期化エラー: {e}")
            raise

    async def _initialize_clustering_models(self):
        """クラスタリングモデル初期化"""
        try:
            # K-Means（ユーザーセグメント用）
            self.clustering_models['kmeans'] = KMeans(
                n_clusters=5,  # デフォルト5セグメント
                random_state=42,
                max_iter=300
            )
            
            # DBSCAN（異常行動検出用）
            self.clustering_models['dbscan'] = DBSCAN(
                eps=0.5,
                min_samples=3
            )
            
            # データ前処理用
            self.clustering_models['scaler'] = StandardScaler()
            self.clustering_models['pca'] = PCA(n_components=0.95)
            
            # クラスタリング設定
            self.clustering_models['config'] = {
                'min_sessions': 5,  # 最低セッション数
                'features': [
                    'session_count', 'avg_session_duration', 'pages_per_session',
                    'bounce_rate', 'conversion_rate', 'return_visitor',
                    'device_diversity', 'time_diversity'
                ]
            }
            
            logger.info("クラスタリングモデル初期化完了")
            
        except Exception as e:
            logger.error(f"クラスタリングモデル初期化エラー: {e}")

    async def _setup_funnel_configurations(self):
        """ファネル設定"""
        try:
            # デフォルトファネル段階
            self.funnel_configs = {
                'default': {
                    'stages': self.settings.behavior_funnel_stages,
                    'stage_mapping': {
                        'visit': ['page_view', 'session_start'],
                        'view': ['product_view', 'content_view'],
                        'interact': ['click', 'scroll', 'form_interaction'],
                        'convert': ['purchase', 'signup', 'download']
                    }
                },
                'ecommerce': {
                    'stages': ['visit', 'browse', 'add_to_cart', 'checkout', 'purchase'],
                    'stage_mapping': {
                        'visit': ['session_start', 'landing_page'],
                        'browse': ['product_view', 'category_view'],
                        'add_to_cart': ['add_to_cart'],
                        'checkout': ['checkout_start', 'payment_info'],
                        'purchase': ['purchase_complete']
                    }
                },
                'lead_generation': {
                    'stages': ['visit', 'engage', 'lead', 'qualify', 'convert'],
                    'stage_mapping': {
                        'visit': ['session_start'],
                        'engage': ['content_view', 'video_play'],
                        'lead': ['form_start', 'email_signup'],
                        'qualify': ['form_submit', 'demo_request'],
                        'convert': ['sales_qualified_lead', 'customer']
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"ファネル設定エラー: {e}")

    async def _load_existing_segments(self):
        """既存セグメント読み込み"""
        try:
            segment_keys = await self.redis_client.keys("user_segments:*")
            
            for key in segment_keys:
                segment_data = await self.redis_client.get(key)
                if segment_data:
                    site_id = key.split(':')[1]
                    self.user_segments[site_id] = json.loads(segment_data)
            
            logger.info(f"{len(self.user_segments)}サイトのセグメントデータを読み込み")
            
        except Exception as e:
            logger.warning(f"既存セグメント読み込みエラー: {e}")
            self.user_segments = {}

    async def analyze_user_behavior(
        self, 
        site_id: str, 
        date_range: Dict[str, datetime],
        user_segment: Optional[str] = None
    ) -> Dict[str, UserBehaviorPattern]:
        """ユーザー行動分析実行"""
        try:
            start_time = datetime.utcnow()
            
            # 行動データ取得
            behavior_data = await self._fetch_behavior_data(site_id, date_range)
            
            if behavior_data.empty:
                logger.warning(f"行動データが空: {site_id}")
                return {}
            
            # セグメントフィルタ適用
            if user_segment:
                behavior_data = await self._filter_by_segment(behavior_data, user_segment)
            
            # 並行して複数分析を実行
            analysis_tasks = [
                self._analyze_session_patterns(behavior_data),
                self._analyze_page_flow(behavior_data),
                self._analyze_engagement_patterns(behavior_data),
                self._analyze_conversion_behavior(behavior_data),
                self._detect_behavioral_anomalies(behavior_data)
            ]
            
            analysis_results = await asyncio.gather(*analysis_tasks)
            
            # 結果を統合
            behavior_patterns = {
                "session_patterns": analysis_results[0],
                "page_flow_patterns": analysis_results[1], 
                "engagement_patterns": analysis_results[2],
                "conversion_patterns": analysis_results[3],
                "anomalous_patterns": analysis_results[4]
            }
            
            # 処理時間ログ
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"行動分析完了 ({site_id}): {processing_time:.2f}秒")
            
            return behavior_patterns
            
        except Exception as e:
            logger.error(f"ユーザー行動分析エラー ({site_id}): {e}")
            return {}

    async def comprehensive_behavior_analysis(
        self, 
        site_id: str, 
        user_segment: Optional[str] = None
    ) -> Dict[str, Any]:
        """包括的行動分析"""
        try:
            # 分析期間設定（過去30日）
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            date_range = {"start": start_date, "end": end_date}
            
            # 並行分析実行
            analysis_tasks = [
                self.analyze_user_behavior(site_id, date_range, user_segment),
                self._segment_users(site_id, date_range),
                self._analyze_user_journeys(site_id, date_range),
                self._analyze_conversion_funnels(site_id, date_range),
                self._generate_optimization_suggestions(site_id, date_range)
            ]
            
            results = await asyncio.gather(*analysis_tasks)
            
            return {
                "patterns": results[0],
                "user_segments": results[1],
                "journeys": results[2],
                "funnels": results[3],
                "optimizations": results[4],
                "analysis_summary": await self._generate_behavior_summary(results)
            }
            
        except Exception as e:
            logger.error(f"包括的行動分析エラー ({site_id}): {e}")
            return {"error": str(e)}

    async def _analyze_session_patterns(self, data: pd.DataFrame) -> Dict[str, Any]:
        """セッションパターン分析"""
        try:
            if data.empty:
                return {"patterns": []}
            
            # セッション基本統計
            session_stats = {
                "avg_duration": data['session_duration'].mean() if 'session_duration' in data.columns else 0,
                "median_duration": data['session_duration'].median() if 'session_duration' in data.columns else 0,
                "avg_pages": data['pages_per_session'].mean() if 'pages_per_session' in data.columns else 0,
                "bounce_rate": data['bounced'].mean() if 'bounced' in data.columns else 0
            }
            
            # 時間帯別パターン
            if 'timestamp' in data.columns:
                data['hour'] = pd.to_datetime(data['timestamp']).dt.hour
                hourly_pattern = data.groupby('hour').agg({
                    'session_duration': 'mean',
                    'pages_per_session': 'mean',
                    'bounced': 'mean'
                }).to_dict()
            else:
                hourly_pattern = {}
            
            # デバイス別パターン
            if 'device_type' in data.columns:
                device_pattern = data.groupby('device_type').agg({
                    'session_duration': 'mean',
                    'pages_per_session': 'mean',
                    'bounced': 'mean'
                }).to_dict()
            else:
                device_pattern = {}
            
            # セッション長別分布
            if 'session_duration' in data.columns:
                duration_bins = pd.cut(data['session_duration'], 
                                     bins=[0, 30, 120, 300, 600, float('inf')], 
                                     labels=['<30s', '30s-2m', '2m-5m', '5m-10m', '>10m'])
                duration_distribution = duration_bins.value_counts().to_dict()
            else:
                duration_distribution = {}
            
            # エンゲージメントレベル分類
            engagement_levels = await self._classify_engagement_levels(data)
            
            return {
                "session_stats": session_stats,
                "hourly_patterns": hourly_pattern,
                "device_patterns": device_pattern,
                "duration_distribution": duration_distribution,
                "engagement_levels": engagement_levels,
                "total_sessions": len(data)
            }
            
        except Exception as e:
            logger.error(f"セッションパターン分析エラー: {e}")
            return {"patterns": [], "error": str(e)}

    async def _analyze_page_flow(self, data: pd.DataFrame) -> Dict[str, Any]:
        """ページフロー分析"""
        try:
            if data.empty or 'page_sequence' not in data.columns:
                return {"flows": []}
            
            # ページ遷移パターン抽出
            page_transitions = {}
            popular_paths = {}
            exit_points = {}
            
            for _, session in data.iterrows():
                if pd.isna(session.get('page_sequence')):
                    continue
                
                try:
                    pages = json.loads(session['page_sequence']) if isinstance(session['page_sequence'], str) else session['page_sequence']
                    
                    # ページ遷移カウント
                    for i in range(len(pages) - 1):
                        transition = f"{pages[i]} -> {pages[i+1]}"
                        page_transitions[transition] = page_transitions.get(transition, 0) + 1
                    
                    # 人気パス（3ページ以上）
                    if len(pages) >= 3:
                        path = " -> ".join(pages[:3])
                        popular_paths[path] = popular_paths.get(path, 0) + 1
                    
                    # 離脱ポイント
                    if pages:
                        exit_page = pages[-1]
                        exit_points[exit_page] = exit_points.get(exit_page, 0) + 1
                        
                except (json.JSONDecodeError, TypeError):
                    continue
            
            # 上位パターンを抽出
            top_transitions = dict(sorted(page_transitions.items(), key=lambda x: x[1], reverse=True)[:20])
            top_paths = dict(sorted(popular_paths.items(), key=lambda x: x[1], reverse=True)[:10])
            top_exits = dict(sorted(exit_points.items(), key=lambda x: x[1], reverse=True)[:10])
            
            # フロー効率性分析
            flow_efficiency = await self._analyze_flow_efficiency(data, page_transitions)
            
            return {
                "top_transitions": top_transitions,
                "popular_paths": top_paths,
                "top_exit_points": top_exits,
                "flow_efficiency": flow_efficiency,
                "total_unique_transitions": len(page_transitions)
            }
            
        except Exception as e:
            logger.error(f"ページフロー分析エラー: {e}")
            return {"flows": [], "error": str(e)}

    async def _analyze_engagement_patterns(self, data: pd.DataFrame) -> Dict[str, Any]:
        """エンゲージメントパターン分析"""
        try:
            if data.empty:
                return {"patterns": []}
            
            engagement_metrics = {}
            
            # スクロール行動分析
            if 'scroll_depth' in data.columns:
                scroll_stats = {
                    "avg_scroll_depth": data['scroll_depth'].mean(),
                    "deep_scroll_rate": (data['scroll_depth'] > 0.75).mean()
                }
                engagement_metrics['scroll_behavior'] = scroll_stats
            
            # クリック行動分析
            if 'click_count' in data.columns:
                click_stats = {
                    "avg_clicks_per_session": data['click_count'].mean(),
                    "high_interaction_rate": (data['click_count'] > 5).mean()
                }
                engagement_metrics['click_behavior'] = click_stats
            
            # 滞在時間パターン
            if 'time_on_page' in data.columns:
                time_stats = {
                    "avg_time_on_page": data['time_on_page'].mean(),
                    "engaged_time_rate": (data['time_on_page'] > 120).mean()  # 2分以上
                }
                engagement_metrics['time_engagement'] = time_stats
            
            # エンゲージメントスコア計算
            engagement_scores = await self._calculate_engagement_scores(data)
            
            # エンゲージメント予測要因
            engagement_factors = await self._identify_engagement_factors(data)
            
            return {
                "engagement_metrics": engagement_metrics,
                "engagement_scores": engagement_scores,
                "engagement_factors": engagement_factors,
                "engagement_trends": await self._analyze_engagement_trends(data)
            }
            
        except Exception as e:
            logger.error(f"エンゲージメントパターン分析エラー: {e}")
            return {"patterns": [], "error": str(e)}

    async def _analyze_conversion_behavior(self, data: pd.DataFrame) -> Dict[str, Any]:
        """コンバージョン行動分析"""
        try:
            if data.empty:
                return {"patterns": []}
            
            # コンバーター vs 非コンバーターの行動比較
            if 'converted' in data.columns:
                converters = data[data['converted'] == True]
                non_converters = data[data['converted'] == False]
                
                behavior_comparison = {
                    "converters": {
                        "avg_session_duration": converters['session_duration'].mean() if not converters.empty and 'session_duration' in converters.columns else 0,
                        "avg_pages_per_session": converters['pages_per_session'].mean() if not converters.empty and 'pages_per_session' in converters.columns else 0,
                        "bounce_rate": converters['bounced'].mean() if not converters.empty and 'bounced' in converters.columns else 0
                    },
                    "non_converters": {
                        "avg_session_duration": non_converters['session_duration'].mean() if not non_converters.empty and 'session_duration' in non_converters.columns else 0,
                        "avg_pages_per_session": non_converters['pages_per_session'].mean() if not non_converters.empty and 'pages_per_session' in non_converters.columns else 0,
                        "bounce_rate": non_converters['bounced'].mean() if not non_converters.empty and 'bounced' in non_converters.columns else 0
                    }
                }
            else:
                behavior_comparison = {}
            
            # コンバージョンパス分析
            conversion_paths = await self._analyze_conversion_paths(data)
            
            # コンバージョンタイミング分析
            conversion_timing = await self._analyze_conversion_timing(data)
            
            # コンバージョン影響要因
            conversion_factors = await self._identify_conversion_factors(data)
            
            return {
                "behavior_comparison": behavior_comparison,
                "conversion_paths": conversion_paths,
                "conversion_timing": conversion_timing,
                "conversion_factors": conversion_factors
            }
            
        except Exception as e:
            logger.error(f"コンバージョン行動分析エラー: {e}")
            return {"patterns": [], "error": str(e)}

    async def _detect_behavioral_anomalies(self, data: pd.DataFrame) -> List[Dict[str, Any]]:
        """行動異常検出"""
        try:
            if data.empty:
                return []
            
            anomalies = []
            
            # 異常に長い/短いセッション
            if 'session_duration' in data.columns:
                duration_z_scores = np.abs((data['session_duration'] - data['session_duration'].mean()) / data['session_duration'].std())
                duration_anomalies = data[duration_z_scores > 3]
                
                for _, row in duration_anomalies.iterrows():
                    anomalies.append({
                        "type": "session_duration_anomaly",
                        "value": row['session_duration'],
                        "z_score": duration_z_scores[row.name],
                        "description": f"異常なセッション時間: {row['session_duration']:.0f}秒"
                    })
            
            # 異常なページビュー数
            if 'pages_per_session' in data.columns:
                pages_z_scores = np.abs((data['pages_per_session'] - data['pages_per_session'].mean()) / data['pages_per_session'].std())
                pages_anomalies = data[pages_z_scores > 3]
                
                for _, row in pages_anomalies.iterrows():
                    anomalies.append({
                        "type": "page_views_anomaly",
                        "value": row['pages_per_session'],
                        "z_score": pages_z_scores[row.name],
                        "description": f"異常なページビュー数: {row['pages_per_session']:.0f}ページ"
                    })
            
            # ボット的行動パターン
            bot_patterns = await self._detect_bot_patterns(data)
            anomalies.extend(bot_patterns)
            
            return anomalies[:50]  # 最大50件
            
        except Exception as e:
            logger.error(f"行動異常検出エラー: {e}")
            return []

    async def _segment_users(self, site_id: str, date_range: Dict[str, datetime]) -> Dict[str, Any]:
        """ユーザーセグメント分析"""
        try:
            # セグメント用データ取得
            user_data = await self._fetch_user_segmentation_data(site_id, date_range)
            
            if user_data.empty:
                return {"segments": {}}
            
            # 特徴量準備
            features = await self._prepare_segmentation_features(user_data)
            
            if features.empty:
                return {"segments": {}}
            
            # K-meansクラスタリング
            scaler = self.clustering_models['scaler']
            scaled_features = scaler.fit_transform(features)
            
            # 最適クラスタ数決定
            optimal_clusters = await self._find_optimal_clusters(scaled_features)
            
            # クラスタリング実行
            kmeans = KMeans(n_clusters=optimal_clusters, random_state=42)
            cluster_labels = kmeans.fit_predict(scaled_features)
            
            # セグメント特性分析
            segments = await self._analyze_segment_characteristics(
                user_data, features, cluster_labels, optimal_clusters
            )
            
            # セグメントを保存
            await self._save_user_segments(site_id, segments)
            
            return {
                "segments": segments,
                "total_users": len(user_data),
                "optimal_clusters": optimal_clusters
            }
            
        except Exception as e:
            logger.error(f"ユーザーセグメント分析エラー ({site_id}): {e}")
            return {"segments": {}, "error": str(e)}

    async def _analyze_user_journeys(self, site_id: str, date_range: Dict[str, datetime]) -> List[Dict[str, Any]]:
        """ユーザージャーニー分析"""
        try:
            # ジャーニーデータ取得
            journey_data = await self._fetch_journey_data(site_id, date_range)
            
            if journey_data.empty:
                return []
            
            # ジャーニーパターン抽出
            journey_patterns = []
            
            # 代表的なジャーニーパス
            common_journeys = await self._extract_common_journeys(journey_data)
            journey_patterns.extend(common_journeys)
            
            # コンバージョンジャーニー
            conversion_journeys = await self._extract_conversion_journeys(journey_data)
            journey_patterns.extend(conversion_journeys)
            
            # 離脱ジャーニー
            dropout_journeys = await self._extract_dropout_journeys(journey_data)
            journey_patterns.extend(dropout_journeys)
            
            return journey_patterns
            
        except Exception as e:
            logger.error(f"ユーザージャーニー分析エラー ({site_id}): {e}")
            return []

    async def _analyze_conversion_funnels(self, site_id: str, date_range: Dict[str, datetime]) -> Dict[str, Any]:
        """コンバージョンファネル分析"""
        try:
            # ファネルデータ取得
            funnel_data = await self._fetch_funnel_data(site_id, date_range)
            
            if funnel_data.empty:
                return {}
            
            # デフォルトファネル分析
            default_funnel = await self._analyze_funnel(
                funnel_data, 
                self.funnel_configs['default']
            )
            
            funnels = {"default": default_funnel}
            
            # 業種別ファネル分析（データがある場合）
            site_type = await self._detect_site_type(funnel_data)
            if site_type in self.funnel_configs:
                specialized_funnel = await self._analyze_funnel(
                    funnel_data,
                    self.funnel_configs[site_type]
                )
                funnels[site_type] = specialized_funnel
            
            return funnels
            
        except Exception as e:
            logger.error(f"コンバージョンファネル分析エラー ({site_id}): {e}")
            return {"error": str(e)}

    async def _generate_optimization_suggestions(self, site_id: str, date_range: Dict[str, datetime]) -> List[Dict[str, Any]]:
        """最適化提案生成"""
        try:
            suggestions = []
            
            # 行動データ取得
            behavior_data = await self._fetch_behavior_data(site_id, date_range)
            
            if behavior_data.empty:
                return suggestions
            
            # 直帰率改善提案
            if 'bounced' in behavior_data.columns:
                bounce_rate = behavior_data['bounced'].mean()
                if bounce_rate > 0.7:
                    suggestions.append({
                        "category": "engagement",
                        "title": "直帰率改善",
                        "description": f"直帰率が{bounce_rate:.1%}と高いです",
                        "recommendation": "ランディングページのコンテンツとUIを改善してください",
                        "expected_impact": "medium",
                        "effort_required": "medium"
                    })
            
            # セッション時間延長提案
            if 'session_duration' in behavior_data.columns:
                avg_duration = behavior_data['session_duration'].mean()
                if avg_duration < 120:  # 2分未満
                    suggestions.append({
                        "category": "engagement",
                        "title": "セッション時間延長",
                        "description": f"平均セッション時間が{avg_duration:.0f}秒と短いです",
                        "recommendation": "関連コンテンツの推薦機能を追加してください",
                        "expected_impact": "high",
                        "effort_required": "medium"
                    })
            
            # コンバージョン率改善提案
            if 'converted' in behavior_data.columns:
                conversion_rate = behavior_data['converted'].mean()
                if conversion_rate < 0.03:  # 3%未満
                    suggestions.append({
                        "category": "conversion",
                        "title": "コンバージョン率改善",
                        "description": f"コンバージョン率が{conversion_rate:.2%}と低いです",
                        "recommendation": "CTAボタンの配置と文言を最適化してください",
                        "expected_impact": "high",
                        "effort_required": "low"
                    })
            
            # モバイル最適化提案
            if 'device_type' in behavior_data.columns:
                mobile_users = behavior_data[behavior_data['device_type'] == 'mobile']
                if not mobile_users.empty:
                    mobile_bounce = mobile_users['bounced'].mean() if 'bounced' in mobile_users.columns else 0
                    desktop_bounce = behavior_data[behavior_data['device_type'] == 'desktop']['bounced'].mean() if 'bounced' in behavior_data.columns else 0
                    
                    if mobile_bounce > desktop_bounce * 1.2:
                        suggestions.append({
                            "category": "mobile",
                            "title": "モバイル体験改善",
                            "description": "モバイルユーザーの直帰率がデスクトップより20%高いです",
                            "recommendation": "モバイル向けページ速度とUIを最適化してください",
                            "expected_impact": "high",
                            "effort_required": "high"
                        })
            
            return suggestions[:10]  # 最大10件
            
        except Exception as e:
            logger.error(f"最適化提案生成エラー ({site_id}): {e}")
            return []

    # ヘルパーメソッド（簡略実装）
    
    async def _fetch_behavior_data(self, site_id: str, date_range: Dict[str, datetime]) -> pd.DataFrame:
        """行動データ取得"""
        try:
            # サンプルデータ生成（実装時は実際のAPIを呼び出し）
            start_date = date_range['start']
            end_date = date_range['end']
            
            days = (end_date - start_date).days
            n_sessions = days * 100  # 1日100セッション
            
            np.random.seed(42)
            
            data = {
                'session_id': [f"session_{i}" for i in range(n_sessions)],
                'timestamp': pd.date_range(start=start_date, end=end_date, periods=n_sessions),
                'session_duration': np.random.gamma(2, 120, n_sessions),  # 平均240秒
                'pages_per_session': np.random.poisson(3, n_sessions) + 1,
                'bounced': np.random.random(n_sessions) < 0.6,
                'converted': np.random.random(n_sessions) < 0.03,
                'device_type': np.random.choice(['desktop', 'mobile', 'tablet'], n_sessions, p=[0.5, 0.4, 0.1]),
                'scroll_depth': np.random.beta(2, 2, n_sessions),
                'click_count': np.random.poisson(5, n_sessions),
                'time_on_page': np.random.gamma(1.5, 80, n_sessions)
            }
            
            return pd.DataFrame(data)
            
        except Exception as e:
            logger.error(f"行動データ取得エラー: {e}")
            return pd.DataFrame()

    async def _classify_engagement_levels(self, data: pd.DataFrame) -> Dict[str, int]:
        """エンゲージメントレベル分類"""
        try:
            if data.empty:
                return {}
            
            # エンゲージメントスコア計算
            engagement_scores = []
            for _, row in data.iterrows():
                score = 0
                if 'session_duration' in data.columns:
                    score += min(row['session_duration'] / 300, 1) * 0.3  # 5分で満点
                if 'pages_per_session' in data.columns:
                    score += min(row['pages_per_session'] / 10, 1) * 0.2  # 10ページで満点
                if 'scroll_depth' in data.columns:
                    score += row.get('scroll_depth', 0) * 0.2
                if 'click_count' in data.columns:
                    score += min(row.get('click_count', 0) / 10, 1) * 0.2
                if not row.get('bounced', True):
                    score += 0.1  # 非直帰ボーナス
                
                engagement_scores.append(score)
            
            # レベル分類
            levels = {
                'high': sum(1 for s in engagement_scores if s > 0.7),
                'medium': sum(1 for s in engagement_scores if 0.4 <= s <= 0.7),
                'low': sum(1 for s in engagement_scores if s < 0.4)
            }
            
            return levels
            
        except Exception:
            return {'high': 0, 'medium': 0, 'low': 0}

    # 他の簡略実装メソッド
    async def _filter_by_segment(self, data, segment):
        return data  # 簡略実装

    async def _analyze_flow_efficiency(self, data, transitions):
        return {"efficiency_score": 0.75}  # 簡略実装

    async def _calculate_engagement_scores(self, data):
        return {"avg_engagement_score": 0.65}  # 簡略実装

    async def _identify_engagement_factors(self, data):
        return ["content_quality", "page_load_speed", "mobile_optimization"]  # 簡略実装

    async def _analyze_engagement_trends(self, data):
        return {"trend": "stable"}  # 簡略実装

    async def _analyze_conversion_paths(self, data):
        return {"common_paths": []}  # 簡略実装

    async def _analyze_conversion_timing(self, data):
        return {"avg_time_to_convert": 3600}  # 簡略実装

    async def _identify_conversion_factors(self, data):
        return ["page_views", "session_duration", "return_visits"]  # 簡略実装

    async def _detect_bot_patterns(self, data):
        return []  # 簡略実装

    async def _fetch_user_segmentation_data(self, site_id, date_range):
        return pd.DataFrame()  # 簡略実装

    async def _prepare_segmentation_features(self, data):
        return pd.DataFrame()  # 簡略実装

    async def _find_optimal_clusters(self, features):
        return 5  # 簡略実装

    async def _analyze_segment_characteristics(self, user_data, features, labels, n_clusters):
        return {}  # 簡略実装

    async def _save_user_segments(self, site_id, segments):
        pass  # 簡略実装

    async def _fetch_journey_data(self, site_id, date_range):
        return pd.DataFrame()  # 簡略実装

    async def _extract_common_journeys(self, data):
        return []  # 簡略実装

    async def _extract_conversion_journeys(self, data):
        return []  # 簡略実装

    async def _extract_dropout_journeys(self, data):
        return []  # 簡略実装

    async def _fetch_funnel_data(self, site_id, date_range):
        return pd.DataFrame()  # 簡略実装

    async def _analyze_funnel(self, data, config):
        return {"stages": [], "conversion_rates": []}  # 簡略実装

    async def _detect_site_type(self, data):
        return "default"  # 簡略実装

    async def _generate_behavior_summary(self, results):
        return {"summary": "行動分析完了"}  # 簡略実装

    async def health_check(self) -> bool:
        """ヘルスチェック"""
        try:
            if self.redis_client:
                await self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"ユーザー行動分析サービス ヘルスチェックエラー: {e}")
            return False