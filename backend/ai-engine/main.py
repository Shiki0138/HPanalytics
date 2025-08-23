"""
革新的AI分析エンジン - FastAPI メインサーバー
Google Analytics Intelligence、Adobe Senseiを超える次世代AI分析システム
"""
import os
import asyncio
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime, timedelta
import json

from config.settings import Settings
from services.ai_analytics import AIAnalyticsService
from services.insight_generator import InsightGeneratorService
from services.realtime_processor import RealtimeProcessorService
from services.anomaly_detector import AnomalyDetectorService
from services.trend_analyzer import TrendAnalyzerService
from services.behavior_analyzer import BehaviorAnalyzerService
from models.schemas import (
    AnalyticsRequest, InsightRequest, RealtimeAnalysisRequest,
    AnalyticsResponse, InsightResponse, RealtimeAnalysisResponse,
    AnomalyDetectionResponse, TrendAnalysisResponse, BehaviorAnalysisResponse
)
from utils.websocket_manager import WebSocketManager
from utils.logger import setup_logger

# ロガーのセットアップ
logger = setup_logger()

# グローバル変数
websocket_manager = WebSocketManager()
ai_analytics_service = None
insight_generator = None
realtime_processor = None
anomaly_detector = None
trend_analyzer = None
behavior_analyzer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    global ai_analytics_service, insight_generator, realtime_processor
    global anomaly_detector, trend_analyzer, behavior_analyzer
    
    # 起動時の初期化
    logger.info("AI分析エンジンを初期化中...")
    
    settings = Settings()
    ai_analytics_service = AIAnalyticsService(settings)
    insight_generator = InsightGeneratorService(settings)
    realtime_processor = RealtimeProcessorService(settings)
    anomaly_detector = AnomalyDetectorService(settings)
    trend_analyzer = TrendAnalyzerService(settings)
    behavior_analyzer = BehaviorAnalyzerService(settings)
    
    # サービスの初期化
    await ai_analytics_service.initialize()
    await insight_generator.initialize()
    await realtime_processor.initialize()
    await anomaly_detector.initialize()
    await trend_analyzer.initialize()
    await behavior_analyzer.initialize()
    
    logger.info("AI分析エンジンの初期化が完了しました")
    
    yield
    
    # 終了時のクリーンアップ
    logger.info("AI分析エンジンをシャットダウン中...")
    if realtime_processor:
        await realtime_processor.cleanup()
    logger.info("AI分析エンジンのシャットダウンが完了しました")

# FastAPIアプリケーションの作成
app = FastAPI(
    title="革新的AI分析エンジン",
    description="Google Analytics Intelligence、Adobe Senseiを超える次世代AI分析システム",
    version="1.0.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """ヘルスチェックエンドポイント"""
    return {
        "message": "革新的AI分析エンジン稼働中",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """詳細ヘルスチェック"""
    try:
        # 各サービスの状態をチェック
        services_status = {
            "ai_analytics": await ai_analytics_service.health_check() if ai_analytics_service else False,
            "insight_generator": await insight_generator.health_check() if insight_generator else False,
            "realtime_processor": await realtime_processor.health_check() if realtime_processor else False,
            "anomaly_detector": await anomaly_detector.health_check() if anomaly_detector else False,
            "trend_analyzer": await trend_analyzer.health_check() if trend_analyzer else False,
            "behavior_analyzer": await behavior_analyzer.health_check() if behavior_analyzer else False
        }
        
        overall_healthy = all(services_status.values())
        
        return {
            "status": "healthy" if overall_healthy else "degraded",
            "services": services_status,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"ヘルスチェックエラー: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )

# ============ 高度AI分析エンドポイント ============

@app.post("/api/v1/analyze/comprehensive", response_model=AnalyticsResponse)
async def comprehensive_analysis(
    request: AnalyticsRequest,
    background_tasks: BackgroundTasks
) -> AnalyticsResponse:
    """包括的AI分析実行"""
    try:
        logger.info(f"包括的分析開始 - サイト: {request.site_id}")
        
        # 並行して複数の分析を実行
        analysis_tasks = [
            ai_analytics_service.comprehensive_analysis(request),
            anomaly_detector.detect_anomalies(request.site_id, request.date_range),
            trend_analyzer.analyze_trends(request.site_id, request.date_range),
            behavior_analyzer.analyze_user_behavior(request.site_id, request.date_range)
        ]
        
        results = await asyncio.gather(*analysis_tasks)
        
        # 結果を統合
        comprehensive_result = {
            "main_analysis": results[0],
            "anomalies": results[1],
            "trends": results[2],
            "user_behavior": results[3]
        }
        
        # バックグラウンドでインサイト生成
        background_tasks.add_task(
            generate_insights_background,
            request.site_id,
            comprehensive_result
        )
        
        return AnalyticsResponse(
            site_id=request.site_id,
            analysis_type="comprehensive",
            results=comprehensive_result,
            timestamp=datetime.utcnow(),
            confidence_score=0.95
        )
        
    except Exception as e:
        logger.error(f"包括的分析エラー: {e}")
        raise HTTPException(status_code=500, detail=f"分析実行エラー: {str(e)}")

@app.post("/api/v1/insights/generate", response_model=InsightResponse)
async def generate_insights(request: InsightRequest) -> InsightResponse:
    """AI自動インサイト生成"""
    try:
        logger.info(f"インサイト生成開始 - サイト: {request.site_id}")
        
        insights = await insight_generator.generate_comprehensive_insights(
            site_id=request.site_id,
            data=request.analytics_data,
            focus_areas=request.focus_areas
        )
        
        return InsightResponse(
            site_id=request.site_id,
            insights=insights,
            timestamp=datetime.utcnow(),
            actionable_items=insights.get("actionable_recommendations", []),
            roi_predictions=insights.get("roi_predictions", {}),
            confidence_level="high"
        )
        
    except Exception as e:
        logger.error(f"インサイト生成エラー: {e}")
        raise HTTPException(status_code=500, detail=f"インサイト生成エラー: {str(e)}")

@app.post("/api/v1/anomalies/detect", response_model=AnomalyDetectionResponse)
async def detect_anomalies(site_id: str, days: int = 30) -> AnomalyDetectionResponse:
    """高度異常値検知"""
    try:
        logger.info(f"異常値検知開始 - サイト: {site_id}")
        
        date_range = {
            "start": datetime.utcnow() - timedelta(days=days),
            "end": datetime.utcnow()
        }
        
        anomalies = await anomaly_detector.detect_anomalies(site_id, date_range)
        
        return AnomalyDetectionResponse(
            site_id=site_id,
            anomalies=anomalies,
            detection_period=date_range,
            total_anomalies=len(anomalies),
            severity_breakdown=anomaly_detector.get_severity_breakdown(anomalies),
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"異常値検知エラー: {e}")
        raise HTTPException(status_code=500, detail=f"異常値検知エラー: {str(e)}")

@app.post("/api/v1/trends/analyze", response_model=TrendAnalysisResponse)
async def analyze_trends(site_id: str, period: str = "30d") -> TrendAnalysisResponse:
    """高度トレンド分析と予測"""
    try:
        logger.info(f"トレンド分析開始 - サイト: {site_id}")
        
        analysis_result = await trend_analyzer.comprehensive_trend_analysis(
            site_id=site_id,
            period=period
        )
        
        return TrendAnalysisResponse(
            site_id=site_id,
            trends=analysis_result["trends"],
            predictions=analysis_result["predictions"],
            seasonal_patterns=analysis_result["seasonal_patterns"],
            growth_opportunities=analysis_result["growth_opportunities"],
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"トレンド分析エラー: {e}")
        raise HTTPException(status_code=500, detail=f"トレンド分析エラー: {str(e)}")

@app.post("/api/v1/behavior/analyze", response_model=BehaviorAnalysisResponse)
async def analyze_user_behavior(site_id: str, segment: Optional[str] = None) -> BehaviorAnalysisResponse:
    """ユーザー行動パターン分析"""
    try:
        logger.info(f"行動分析開始 - サイト: {site_id}")
        
        behavior_analysis = await behavior_analyzer.comprehensive_behavior_analysis(
            site_id=site_id,
            user_segment=segment
        )
        
        return BehaviorAnalysisResponse(
            site_id=site_id,
            behavior_patterns=behavior_analysis["patterns"],
            user_journeys=behavior_analysis["journeys"],
            conversion_funnels=behavior_analysis["funnels"],
            optimization_suggestions=behavior_analysis["optimizations"],
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"行動分析エラー: {e}")
        raise HTTPException(status_code=500, detail=f"行動分析エラー: {str(e)}")

# ============ リアルタイム分析エンドポイント ============

@app.websocket("/ws/realtime/{site_id}")
async def realtime_analytics_websocket(websocket: WebSocket, site_id: str):
    """リアルタイム分析WebSocket接続"""
    await websocket_manager.connect(websocket, site_id)
    try:
        # リアルタイム処理開始
        await realtime_processor.start_realtime_analysis(site_id, websocket_manager)
        
        while True:
            # クライアントからのメッセージ待機
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # メッセージタイプに応じた処理
            await handle_realtime_message(site_id, message, websocket)
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket, site_id)
        await realtime_processor.stop_realtime_analysis(site_id)
        logger.info(f"WebSocket切断 - サイト: {site_id}")
    except Exception as e:
        logger.error(f"WebSocketエラー: {e}")
        await websocket_manager.disconnect(websocket, site_id)

@app.post("/api/v1/realtime/analyze", response_model=RealtimeAnalysisResponse)
async def realtime_analysis(request: RealtimeAnalysisRequest) -> RealtimeAnalysisResponse:
    """リアルタイム分析実行"""
    try:
        analysis_result = await realtime_processor.process_realtime_data(
            site_id=request.site_id,
            event_data=request.event_data,
            analysis_type=request.analysis_type
        )
        
        return RealtimeAnalysisResponse(
            site_id=request.site_id,
            analysis_result=analysis_result,
            processing_time_ms=analysis_result.get("processing_time", 0),
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"リアルタイム分析エラー: {e}")
        raise HTTPException(status_code=500, detail=f"リアルタイム分析エラー: {str(e)}")

# ============ バックグラウンドタスク ============

async def generate_insights_background(site_id: str, analysis_data: Dict[str, Any]):
    """バックグラウンドでのインサイト生成"""
    try:
        logger.info(f"バックグラウンドインサイト生成 - サイト: {site_id}")
        
        insights = await insight_generator.generate_background_insights(
            site_id=site_id,
            analysis_data=analysis_data
        )
        
        # WebSocket経由でリアルタイム配信
        if websocket_manager.has_connections(site_id):
            await websocket_manager.send_to_site(site_id, {
                "type": "insights_generated",
                "data": insights,
                "timestamp": datetime.utcnow().isoformat()
            })
            
    except Exception as e:
        logger.error(f"バックグラウンドインサイト生成エラー: {e}")

async def handle_realtime_message(site_id: str, message: Dict[str, Any], websocket: WebSocket):
    """リアルタイムメッセージハンドリング"""
    try:
        message_type = message.get("type")
        
        if message_type == "request_analysis":
            # 即座に分析実行
            result = await realtime_processor.quick_analysis(site_id, message.get("data"))
            await websocket.send_json({
                "type": "analysis_result",
                "data": result,
                "timestamp": datetime.utcnow().isoformat()
            })
            
        elif message_type == "subscribe_alerts":
            # アラート購読
            await realtime_processor.subscribe_alerts(site_id, message.get("alert_types"))
            
        elif message_type == "configure_thresholds":
            # 閾値設定
            await realtime_processor.configure_thresholds(site_id, message.get("thresholds"))
            
    except Exception as e:
        logger.error(f"リアルタイムメッセージ処理エラー: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        })

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,  # メインバックエンドと分離
        reload=True,
        log_level="info"
    )