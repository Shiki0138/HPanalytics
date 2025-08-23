"""
AI自動インサイト生成エンジン
自然言語での分析結果説明、実行可能な改善提案、ROI予測機能
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import openai
from langchain.chat_models import ChatOpenAI
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.schema import BaseOutputParser
from langchain.callbacks import get_openai_callback
import pandas as pd
import numpy as np
from config.settings import Settings
from models.schemas import InsightData, InsightCategory

logger = logging.getLogger(__name__)

class InsightOutputParser(BaseOutputParser):
    """構造化インサイト出力パーサー"""
    
    def parse(self, text: str) -> Dict[str, Any]:
        """LLM出力をパース"""
        try:
            # JSON形式の場合
            if text.strip().startswith('{'):
                return json.loads(text)
            
            # マークダウン形式の場合の簡単なパース
            insights = self._parse_markdown_insights(text)
            return insights
            
        except json.JSONDecodeError:
            # フォールバック処理
            return self._parse_text_insights(text)
    
    def _parse_markdown_insights(self, text: str) -> Dict[str, Any]:
        """マークダウン形式をパース"""
        insights = {
            "insights": [],
            "recommendations": [],
            "roi_predictions": {},
            "next_steps": []
        }
        
        current_section = None
        for line in text.split('\n'):
            line = line.strip()
            if line.startswith('## '):
                current_section = line[3:].lower().replace(' ', '_')
            elif line and current_section:
                if 'insight' in current_section:
                    insights["insights"].append(line)
                elif 'recommendation' in current_section:
                    insights["recommendations"].append(line)
                elif 'step' in current_section:
                    insights["next_steps"].append(line)
        
        return insights
    
    def _parse_text_insights(self, text: str) -> Dict[str, Any]:
        """テキスト形式をパース"""
        return {
            "insights_text": text,
            "insights": [text[:200] + "..." if len(text) > 200 else text],
            "recommendations": [],
            "roi_predictions": {},
            "next_steps": []
        }

class InsightGeneratorService:
    """AI自動インサイト生成サービス"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.llm = None
        self.insight_chains = {}
        self.output_parser = InsightOutputParser()
        self.insight_templates = {}
        
    async def initialize(self):
        """サービス初期化"""
        try:
            # LangChain LLM初期化
            self.llm = ChatOpenAI(
                model=self.settings.openai_model,
                temperature=self.settings.openai_temperature,
                max_tokens=self.settings.openai_max_tokens,
                openai_api_key=self.settings.openai_api_key
            )
            
            # インサイトテンプレート設定
            await self._setup_insight_templates()
            
            # チェーン初期化
            await self._setup_insight_chains()
            
            logger.info("インサイト生成サービス初期化完了")
            
        except Exception as e:
            logger.error(f"インサイト生成サービス初期化エラー: {e}")
            raise

    async def _setup_insight_templates(self):
        """インサイトテンプレート設定"""
        
        base_system_prompt = """
        あなたは世界最高レベルのWebアナリティクスコンサルタントです。
        データから実用的で価値の高いインサイトを生成し、
        具体的で実行可能な改善提案とROI予測を提供します。
        
        あなたの特徴：
        - データドリブンな洞察力
        - ビジネス価値への変換能力
        - 実行可能な提案力
        - 正確なROI予測
        - わかりやすい日本語説明
        
        回答形式：JSON形式で構造化された結果を返してください。
        必須項目：insights, recommendations, roi_predictions, implementation_plan
        """
        
        self.insight_templates = {
            "comprehensive": {
                "system": base_system_prompt,
                "human": """
                サイトID: {site_id}
                分析データ: 
                {analytics_data}
                
                フォーカス領域: {focus_areas}
                
                以下の包括的インサイトを生成してください：
                
                1. 主要な発見とその意味
                2. ビジネスへの影響度分析
                3. 優先順位付きの改善提案
                4. 各提案の期待ROI（%）
                5. 実装の難易度と期間
                6. 競合他社との比較観点
                7. 長期戦略への提言
                
                JSON形式で回答してください：
                {{
                  "key_findings": [
                    {{"finding": "発見内容", "impact": "影響度", "confidence": 0.9}}
                  ],
                  "insights": [
                    {{
                      "category": "カテゴリ",
                      "title": "インサイトタイトル", 
                      "description": "詳細説明",
                      "impact_score": 8.5,
                      "confidence": 0.85
                    }}
                  ],
                  "recommendations": [
                    {{
                      "title": "推奨事項",
                      "description": "詳細内容",
                      "expected_roi": 25.5,
                      "implementation_effort": "medium",
                      "timeline": "2-4週間",
                      "priority": "high"
                    }}
                  ],
                  "roi_predictions": {{
                    "30_days": 15.2,
                    "90_days": 32.8,
                    "180_days": 55.1
                  }},
                  "implementation_plan": [
                    {{"step": "ステップ", "timeline": "期間", "resources": "必要リソース"}}
                  ]
                }}
                """
            },
            
            "performance": {
                "system": base_system_prompt,
                "human": """
                パフォーマンスデータ:
                {performance_data}
                
                パフォーマンス最適化に特化したインサイトを生成：
                
                1. パフォーマンス問題の特定と根本原因
                2. 技術的改善提案
                3. UXパフォーマンス最適化
                4. コンバージョンへの影響分析
                5. 競合比較とベンチマーク
                6. 具体的な改善アクション
                
                技術的な観点とビジネス価値の両方を含めてください。
                """
            },
            
            "conversion": {
                "system": base_system_prompt,
                "human": """
                コンバージョンデータ:
                {conversion_data}
                
                コンバージョン最適化インサイト：
                
                1. ファネル分析とドロップオフポイント
                2. セグメント別コンバージョンパフォーマンス
                3. A/Bテスト推奨事項
                4. CROの優先順位
                5. 短期・中期・長期の最適化戦略
                6. 期待される売上インパクト
                
                具体的なCRO施策と期待効果を数値で示してください。
                """
            },
            
            "user_experience": {
                "system": base_system_prompt,
                "human": """
                ユーザーエクスペリエンスデータ:
                {ux_data}
                
                UX改善インサイト：
                
                1. ユーザーペインポイントの特定
                2. ユーザージャーニーの最適化機会
                3. UI/UXの改善提案
                4. モバイル・デスクトップ別最適化
                5. アクセシビリティ向上施策
                6. ユーザー満足度向上のアクション
                
                ユーザー中心の観点で実用的な改善提案をしてください。
                """
            },
            
            "content": {
                "system": base_system_prompt,
                "human": """
                コンテンツパフォーマンスデータ:
                {content_data}
                
                コンテンツ最適化インサイト：
                
                1. 高パフォーマンスコンテンツの特徴
                2. 改善が必要なコンテンツ
                3. コンテンツギャップ分析
                4. SEO最適化機会
                5. エンゲージメント向上施策
                6. コンテンツ戦略の提言
                
                データに基づいたコンテンツ戦略を提案してください。
                """
            }
        }

    async def _setup_insight_chains(self):
        """インサイトチェーン設定"""
        try:
            for template_name, template_data in self.insight_templates.items():
                prompt = ChatPromptTemplate.from_messages([
                    SystemMessagePromptTemplate.from_template(template_data["system"]),
                    HumanMessagePromptTemplate.from_template(template_data["human"])
                ])
                
                self.insight_chains[template_name] = LLMChain(
                    llm=self.llm,
                    prompt=prompt,
                    output_parser=self.output_parser
                )
            
            logger.info(f"{len(self.insight_chains)}個のインサイトチェーンを初期化")
            
        except Exception as e:
            logger.error(f"インサイトチェーン設定エラー: {e}")
            raise

    async def generate_comprehensive_insights(
        self, 
        site_id: str, 
        data: Dict[str, Any], 
        focus_areas: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """包括的インサイト生成"""
        try:
            start_time = datetime.utcnow()
            
            # フォーカス領域がない場合は全領域を対象
            if not focus_areas:
                focus_areas = ["performance", "conversion", "user_experience", "content"]
            
            # データ前処理
            processed_data = await self._preprocess_analytics_data(data)
            
            # 並行してカテゴリ別インサイト生成
            insight_tasks = []
            for area in focus_areas:
                if area in self.insight_chains:
                    task = self._generate_category_insights(site_id, processed_data, area)
                    insight_tasks.append((area, task))
            
            # 包括的インサイトも生成
            comprehensive_task = self._generate_comprehensive_insights_internal(
                site_id, processed_data, focus_areas
            )
            insight_tasks.append(("comprehensive", comprehensive_task))
            
            # 並行実行
            insight_results = {}
            for area, task in insight_tasks:
                try:
                    result = await task
                    insight_results[area] = result
                except Exception as e:
                    logger.error(f"{area}インサイト生成エラー: {e}")
                    insight_results[area] = {"error": str(e)}
            
            # 結果統合
            integrated_insights = await self._integrate_insights(insight_results)
            
            # メタデータ追加
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            integrated_insights.update({
                "metadata": {
                    "site_id": site_id,
                    "generated_at": start_time.isoformat(),
                    "processing_time_ms": int(processing_time),
                    "focus_areas": focus_areas,
                    "data_sources": list(data.keys()),
                    "confidence_level": self._calculate_overall_confidence(insight_results)
                }
            })
            
            return integrated_insights
            
        except Exception as e:
            logger.error(f"包括的インサイト生成エラー: {e}")
            return {
                "error": str(e),
                "insights": [],
                "recommendations": [],
                "roi_predictions": {},
                "metadata": {"site_id": site_id, "generated_at": datetime.utcnow().isoformat()}
            }

    async def _generate_comprehensive_insights_internal(
        self, 
        site_id: str, 
        data: Dict[str, Any], 
        focus_areas: List[str]
    ) -> Dict[str, Any]:
        """内部包括的インサイト生成"""
        try:
            chain = self.insight_chains["comprehensive"]
            
            # データ整形
            formatted_data = json.dumps(data, indent=2, ensure_ascii=False, default=str)
            focus_areas_str = ", ".join(focus_areas)
            
            with get_openai_callback() as cb:
                result = await chain.arun(
                    site_id=site_id,
                    analytics_data=formatted_data,
                    focus_areas=focus_areas_str
                )
            
            # コスト情報をログ
            logger.info(f"包括的インサイト生成 - Tokens: {cb.total_tokens}, Cost: ${cb.total_cost:.4f}")
            
            return result if isinstance(result, dict) else {"insights_text": str(result)}
            
        except Exception as e:
            logger.error(f"包括的インサイト内部生成エラー: {e}")
            return {"error": str(e)}

    async def _generate_category_insights(
        self, 
        site_id: str, 
        data: Dict[str, Any], 
        category: str
    ) -> Dict[str, Any]:
        """カテゴリ別インサイト生成"""
        try:
            if category not in self.insight_chains:
                return {"error": f"未対応カテゴリ: {category}"}
            
            chain = self.insight_chains[category]
            
            # カテゴリ固有のデータ準備
            category_data = await self._prepare_category_data(data, category)
            formatted_data = json.dumps(category_data, indent=2, ensure_ascii=False, default=str)
            
            # カテゴリに応じたパラメータ名
            param_mapping = {
                "performance": "performance_data",
                "conversion": "conversion_data", 
                "user_experience": "ux_data",
                "content": "content_data"
            }
            
            param_name = param_mapping.get(category, "data")
            
            with get_openai_callback() as cb:
                result = await chain.arun(**{param_name: formatted_data})
            
            logger.info(f"{category}インサイト生成 - Tokens: {cb.total_tokens}, Cost: ${cb.total_cost:.4f}")
            
            return result if isinstance(result, dict) else {"insights_text": str(result)}
            
        except Exception as e:
            logger.error(f"{category}インサイト生成エラー: {e}")
            return {"error": str(e)}

    async def _preprocess_analytics_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """分析データの前処理"""
        try:
            processed = {}
            
            for key, value in data.items():
                if isinstance(value, dict):
                    # 数値データの統計計算
                    if "metrics" in key or "performance" in key:
                        processed[key] = self._calculate_metrics_summary(value)
                    else:
                        processed[key] = value
                elif isinstance(value, (list, pd.DataFrame)):
                    # リストやDataFrameの場合は要約統計
                    processed[key] = self._summarize_data_structure(value)
                else:
                    processed[key] = value
            
            # 追加のデータエンリッチメント
            processed["data_quality"] = self._assess_data_quality(data)
            processed["analysis_scope"] = self._determine_analysis_scope(data)
            
            return processed
            
        except Exception as e:
            logger.error(f"データ前処理エラー: {e}")
            return data

    def _calculate_metrics_summary(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """メトリクスサマリー計算"""
        try:
            summary = {"original": metrics}
            
            numeric_values = []
            for key, value in metrics.items():
                if isinstance(value, (int, float)):
                    numeric_values.append(value)
            
            if numeric_values:
                summary["statistics"] = {
                    "count": len(numeric_values),
                    "mean": np.mean(numeric_values),
                    "median": np.median(numeric_values),
                    "std": np.std(numeric_values),
                    "min": min(numeric_values),
                    "max": max(numeric_values)
                }
            
            return summary
            
        except Exception:
            return {"original": metrics, "error": "統計計算エラー"}

    def _summarize_data_structure(self, data: Any) -> Dict[str, Any]:
        """データ構造の要約"""
        try:
            if isinstance(data, pd.DataFrame):
                return {
                    "type": "dataframe",
                    "shape": data.shape,
                    "columns": data.columns.tolist(),
                    "dtypes": data.dtypes.to_dict(),
                    "sample": data.head(3).to_dict() if not data.empty else {}
                }
            elif isinstance(data, list):
                return {
                    "type": "list", 
                    "length": len(data),
                    "sample": data[:3] if data else [],
                    "element_types": list(set(type(x).__name__ for x in data[:10]))
                }
            else:
                return {"type": type(data).__name__, "value": str(data)[:200]}
                
        except Exception:
            return {"type": "unknown", "error": "構造解析エラー"}

    def _assess_data_quality(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """データ品質評価"""
        try:
            quality_score = 1.0
            issues = []
            
            # データ完全性チェック
            total_fields = len(data)
            empty_fields = sum(1 for v in data.values() if not v or v == {} or v == [])
            completeness = (total_fields - empty_fields) / max(total_fields, 1)
            
            if completeness < 0.8:
                issues.append("データ完全性が80%未満")
                quality_score *= 0.8
            
            # データ新鮮度チェック（メタデータがある場合）
            metadata = data.get("metadata", {})
            if "analysis_timestamp" in metadata:
                try:
                    timestamp = datetime.fromisoformat(metadata["analysis_timestamp"])
                    age_hours = (datetime.utcnow() - timestamp).total_seconds() / 3600
                    if age_hours > 24:
                        issues.append("データが24時間以上古い")
                        quality_score *= 0.9
                except Exception:
                    pass
            
            return {
                "quality_score": quality_score,
                "completeness": completeness,
                "issues": issues,
                "assessment": "good" if quality_score > 0.8 else "fair" if quality_score > 0.6 else "poor"
            }
            
        except Exception:
            return {"quality_score": 0.5, "assessment": "unknown", "issues": ["品質評価エラー"]}

    def _determine_analysis_scope(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """分析範囲決定"""
        try:
            scope = {
                "available_analyses": [],
                "data_coverage": {},
                "recommended_focus": []
            }
            
            # 利用可能な分析タイプを判定
            if "performance" in str(data).lower():
                scope["available_analyses"].append("performance")
            if "conversion" in str(data).lower():
                scope["available_analyses"].append("conversion")
            if "user" in str(data).lower() or "behavior" in str(data).lower():
                scope["available_analyses"].append("user_experience")
            if "content" in str(data).lower() or "page" in str(data).lower():
                scope["available_analyses"].append("content")
            
            # データカバレッジ評価
            metadata = data.get("metadata", {})
            if "data_points" in metadata:
                data_points = metadata["data_points"]
                if data_points > 1000:
                    scope["data_coverage"]["statistical_significance"] = "high"
                elif data_points > 100:
                    scope["data_coverage"]["statistical_significance"] = "medium"
                else:
                    scope["data_coverage"]["statistical_significance"] = "low"
            
            # 推奨フォーカス決定
            if len(scope["available_analyses"]) >= 3:
                scope["recommended_focus"] = ["comprehensive"]
            else:
                scope["recommended_focus"] = scope["available_analyses"]
            
            return scope
            
        except Exception:
            return {"available_analyses": ["basic"], "recommended_focus": ["basic"]}

    async def _prepare_category_data(self, data: Dict[str, Any], category: str) -> Dict[str, Any]:
        """カテゴリ固有データ準備"""
        try:
            if category == "performance":
                return {
                    "metrics": data.get("performance", {}),
                    "trends": data.get("trends", {}),
                    "benchmarks": data.get("competitive", {}).get("industry_benchmarks", {})
                }
            elif category == "conversion":
                return {
                    "funnel": data.get("conversion", {}).get("funnel_analysis", {}),
                    "attribution": data.get("conversion", {}).get("attribution_analysis", {}),
                    "segments": data.get("engagement", {}).get("engagement_segments", {})
                }
            elif category == "user_experience":
                return {
                    "engagement": data.get("engagement", {}),
                    "behavior": data.get("growth", {}),
                    "journeys": data.get("conversion", {}).get("user_journeys", [])
                }
            elif category == "content":
                return {
                    "content_performance": data.get("engagement", {}).get("content_performance", {}),
                    "page_metrics": data.get("performance", {}),
                    "search_data": {}  # 将来のSEOデータ用
                }
            else:
                return data
                
        except Exception as e:
            logger.error(f"カテゴリデータ準備エラー ({category}): {e}")
            return data

    async def _integrate_insights(self, insight_results: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """インサイト統合"""
        try:
            integrated = {
                "key_findings": [],
                "insights": [],
                "recommendations": [],
                "roi_predictions": {},
                "implementation_plan": [],
                "category_insights": {}
            }
            
            # カテゴリ別結果を統合
            for category, result in insight_results.items():
                if "error" in result:
                    logger.warning(f"{category}カテゴリでエラー: {result['error']}")
                    continue
                
                # カテゴリ固有の結果を保存
                integrated["category_insights"][category] = result
                
                # 共通項目を統合
                if "key_findings" in result:
                    integrated["key_findings"].extend(result["key_findings"])
                
                if "insights" in result:
                    category_insights = result["insights"]
                    if isinstance(category_insights, list):
                        for insight in category_insights:
                            if isinstance(insight, dict):
                                insight["source_category"] = category
                            integrated["insights"].append(insight)
                    elif isinstance(category_insights, str):
                        integrated["insights"].append({
                            "category": category,
                            "title": f"{category.title()}インサイト",
                            "description": category_insights,
                            "source_category": category
                        })
                
                if "recommendations" in result:
                    recommendations = result["recommendations"]
                    if isinstance(recommendations, list):
                        for rec in recommendations:
                            if isinstance(rec, dict):
                                rec["source_category"] = category
                            integrated["recommendations"].append(rec)
                
                if "roi_predictions" in result and result["roi_predictions"]:
                    integrated["roi_predictions"][category] = result["roi_predictions"]
                
                if "implementation_plan" in result:
                    plan = result["implementation_plan"]
                    if isinstance(plan, list):
                        integrated["implementation_plan"].extend(plan)
            
            # 優先度付けとランキング
            integrated["recommendations"] = self._prioritize_recommendations(integrated["recommendations"])
            integrated["insights"] = self._rank_insights(integrated["insights"])
            
            # 統合ROI予測
            integrated["overall_roi_prediction"] = self._calculate_integrated_roi(integrated["roi_predictions"])
            
            return integrated
            
        except Exception as e:
            logger.error(f"インサイト統合エラー: {e}")
            return {
                "insights": [],
                "recommendations": [],
                "roi_predictions": {},
                "error": str(e)
            }

    def _prioritize_recommendations(self, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """推奨事項優先度付け"""
        try:
            def get_priority_score(rec):
                priority_map = {"high": 3, "medium": 2, "low": 1}
                priority = rec.get("priority", "medium")
                roi = rec.get("expected_roi", 0)
                effort_map = {"low": 3, "medium": 2, "high": 1}
                effort = rec.get("implementation_effort", "medium")
                
                return (
                    priority_map.get(priority, 2) * 0.4 +
                    min(roi / 50, 1) * 0.4 +  # ROI上限50%で正規化
                    effort_map.get(effort, 2) * 0.2
                )
            
            return sorted(recommendations, key=get_priority_score, reverse=True)
            
        except Exception:
            return recommendations

    def _rank_insights(self, insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """インサイトランキング"""
        try:
            def get_insight_score(insight):
                impact = insight.get("impact_score", 5)
                confidence = insight.get("confidence", 0.5)
                return impact * confidence
            
            return sorted(insights, key=get_insight_score, reverse=True)
            
        except Exception:
            return insights

    def _calculate_integrated_roi(self, category_rois: Dict[str, Any]) -> Dict[str, float]:
        """統合ROI計算"""
        try:
            integrated_roi = {}
            periods = ["30_days", "90_days", "180_days"]
            
            for period in periods:
                total_roi = 0
                count = 0
                
                for category, roi_data in category_rois.items():
                    if isinstance(roi_data, dict) and period in roi_data:
                        total_roi += roi_data[period]
                        count += 1
                
                if count > 0:
                    integrated_roi[period] = total_roi / count
                else:
                    integrated_roi[period] = 0
            
            return integrated_roi
            
        except Exception:
            return {"30_days": 0, "90_days": 0, "180_days": 0}

    def _calculate_overall_confidence(self, insight_results: Dict[str, Dict[str, Any]]) -> str:
        """全体信頼度レベル計算"""
        try:
            confidences = []
            for result in insight_results.values():
                if "error" not in result:
                    if "confidence" in result:
                        confidences.append(result["confidence"])
                    elif "metadata" in result and "confidence" in result["metadata"]:
                        confidences.append(result["metadata"]["confidence"])
            
            if not confidences:
                return "medium"
            
            avg_confidence = np.mean(confidences)
            
            if avg_confidence > 0.8:
                return "high"
            elif avg_confidence > 0.6:
                return "medium"
            else:
                return "low"
                
        except Exception:
            return "medium"

    async def generate_background_insights(self, site_id: str, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """バックグラウンドインサイト生成"""
        try:
            # 軽量版のインサイト生成（バックグラウンド処理用）
            simplified_data = self._simplify_analysis_data(analysis_data)
            
            # 高速インサイト生成
            quick_insights = await self._generate_quick_insights(site_id, simplified_data)
            
            return {
                "type": "background_insights",
                "site_id": site_id,
                "insights": quick_insights,
                "generated_at": datetime.utcnow().isoformat(),
                "processing_mode": "background"
            }
            
        except Exception as e:
            logger.error(f"バックグラウンドインサイト生成エラー: {e}")
            return {"error": str(e)}

    def _simplify_analysis_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """分析データ簡略化"""
        try:
            # 重要な指標のみ抽出
            simplified = {}
            
            key_metrics = ["performance", "conversion", "engagement"]
            for metric in key_metrics:
                if metric in data:
                    simplified[metric] = data[metric]
            
            # メタデータ保持
            if "metadata" in data:
                simplified["metadata"] = data["metadata"]
            
            return simplified
            
        except Exception:
            return data

    async def _generate_quick_insights(self, site_id: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """クイックインサイト生成"""
        try:
            insights = []
            
            # ルールベースの簡単なインサイト
            performance = data.get("performance", {})
            if performance:
                metrics = performance.get("key_metrics", {})
                
                # 直帰率チェック
                bounce_rate = metrics.get("bounce_rate", 0)
                if bounce_rate > 0.7:
                    insights.append({
                        "category": "performance",
                        "title": "高い直帰率を検出",
                        "description": f"直帰率が{bounce_rate:.1%}と高く、ユーザーエンゲージメントの改善が必要です",
                        "impact_score": 7.5,
                        "confidence": 0.9,
                        "quick_action": "ランディングページの改善を検討"
                    })
                
                # コンバージョン率チェック
                conversion_rate = metrics.get("conversion_rate", 0)
                if conversion_rate < 0.02:
                    insights.append({
                        "category": "conversion",
                        "title": "低いコンバージョン率",
                        "description": f"コンバージョン率が{conversion_rate:.2%}と業界平均を下回っています",
                        "impact_score": 8.0,
                        "confidence": 0.85,
                        "quick_action": "コンバージョンファネルの見直し"
                    })
            
            return insights
            
        except Exception as e:
            logger.error(f"クイックインサイト生成エラー: {e}")
            return []

    async def health_check(self) -> bool:
        """ヘルスチェック"""
        try:
            # 簡単なLLM接続テスト
            test_chain = self.insight_chains.get("comprehensive")
            if test_chain:
                await test_chain.arun(
                    site_id="test",
                    analytics_data="{}",
                    focus_areas="test"
                )
            return True
            
        except Exception as e:
            logger.error(f"インサイト生成サービス ヘルスチェックエラー: {e}")
            return False