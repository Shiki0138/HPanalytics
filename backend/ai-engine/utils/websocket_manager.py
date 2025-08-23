"""
WebSocketマネージャー
リアルタイム通信とコネクション管理
"""
import asyncio
import logging
import json
from typing import Dict, List, Set, Optional, Any
from collections import defaultdict
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionInfo:
    """接続情報"""
    def __init__(self, websocket: WebSocket, site_id: str, connected_at: datetime):
        self.websocket = websocket
        self.site_id = site_id
        self.connected_at = connected_at
        self.last_ping = connected_at
        self.subscriptions = set()

class WebSocketManager:
    """WebSocket接続管理"""
    
    def __init__(self):
        # サイト別接続管理
        self.connections: Dict[str, List[ConnectionInfo]] = defaultdict(list)
        # 全接続のマップ
        self.connection_map: Dict[WebSocket, ConnectionInfo] = {}
        # 統計情報
        self.stats = {
            "total_connections": 0,
            "active_sites": 0,
            "messages_sent": 0,
            "messages_failed": 0
        }
        
    async def connect(self, websocket: WebSocket, site_id: str):
        """WebSocket接続を追加"""
        try:
            await websocket.accept()
            
            connection_info = ConnectionInfo(
                websocket=websocket,
                site_id=site_id,
                connected_at=datetime.utcnow()
            )
            
            # 接続を登録
            self.connections[site_id].append(connection_info)
            self.connection_map[websocket] = connection_info
            
            # 統計更新
            self.stats["total_connections"] += 1
            self.stats["active_sites"] = len(self.connections)
            
            # 接続確認メッセージ送信
            await self.send_to_connection(websocket, {
                "type": "connection_established",
                "site_id": site_id,
                "timestamp": datetime.utcnow().isoformat(),
                "connection_id": id(connection_info)
            })
            
            logger.info(f"WebSocket接続確立: {site_id} (総接続数: {self.stats['total_connections']})")
            
        except Exception as e:
            logger.error(f"WebSocket接続エラー ({site_id}): {e}")
            raise

    async def disconnect(self, websocket: WebSocket, site_id: str):
        """WebSocket接続を削除"""
        try:
            # 接続情報を取得
            connection_info = self.connection_map.get(websocket)
            
            if connection_info:
                # サイト別接続から削除
                if site_id in self.connections:
                    self.connections[site_id] = [
                        conn for conn in self.connections[site_id] 
                        if conn.websocket != websocket
                    ]
                    
                    # サイトに接続がなくなった場合はキーを削除
                    if not self.connections[site_id]:
                        del self.connections[site_id]
                
                # グローバルマップから削除
                del self.connection_map[websocket]
                
                # 統計更新
                self.stats["total_connections"] = max(0, self.stats["total_connections"] - 1)
                self.stats["active_sites"] = len(self.connections)
                
                logger.info(f"WebSocket接続切断: {site_id} (総接続数: {self.stats['total_connections']})")
            
        except Exception as e:
            logger.error(f"WebSocket切断エラー ({site_id}): {e}")

    async def send_to_site(self, site_id: str, message: Dict[str, Any]) -> int:
        """特定サイトの全接続にメッセージ送信"""
        try:
            if site_id not in self.connections:
                return 0
            
            connections = self.connections[site_id].copy()  # コピーを作成
            sent_count = 0
            failed_connections = []
            
            # 全接続に並行送信
            send_tasks = []
            for connection in connections:
                task = self._send_to_connection_safe(connection.websocket, message)
                send_tasks.append((connection, task))
            
            # 結果を取得
            for connection, task in send_tasks:
                try:
                    success = await task
                    if success:
                        sent_count += 1
                    else:
                        failed_connections.append(connection)
                except Exception as e:
                    logger.warning(f"メッセージ送信失敗 ({site_id}): {e}")
                    failed_connections.append(connection)
            
            # 失敗した接続を削除
            for failed_conn in failed_connections:
                await self._remove_failed_connection(failed_conn)
            
            # 統計更新
            self.stats["messages_sent"] += sent_count
            self.stats["messages_failed"] += len(failed_connections)
            
            if sent_count > 0:
                logger.debug(f"メッセージ送信完了 ({site_id}): {sent_count}件成功, {len(failed_connections)}件失敗")
            
            return sent_count
            
        except Exception as e:
            logger.error(f"サイトメッセージ送信エラー ({site_id}): {e}")
            return 0

    async def send_to_connection(self, websocket: WebSocket, message: Dict[str, Any]) -> bool:
        """特定接続にメッセージ送信"""
        try:
            # メッセージにタイムスタンプ追加
            if "timestamp" not in message:
                message["timestamp"] = datetime.utcnow().isoformat()
            
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
            return True
            
        except WebSocketDisconnect:
            logger.debug("WebSocket切断検出")
            return False
        except Exception as e:
            logger.warning(f"WebSocketメッセージ送信エラー: {e}")
            return False

    async def _send_to_connection_safe(self, websocket: WebSocket, message: Dict[str, Any]) -> bool:
        """安全な接続送信（例外処理付き）"""
        try:
            return await self.send_to_connection(websocket, message)
        except Exception:
            return False

    async def _remove_failed_connection(self, connection: ConnectionInfo):
        """失敗した接続を削除"""
        try:
            site_id = connection.site_id
            websocket = connection.websocket
            
            # サイト別接続から削除
            if site_id in self.connections:
                self.connections[site_id] = [
                    conn for conn in self.connections[site_id] 
                    if conn != connection
                ]
                
                if not self.connections[site_id]:
                    del self.connections[site_id]
            
            # グローバルマップから削除
            if websocket in self.connection_map:
                del self.connection_map[websocket]
            
            # 統計更新
            self.stats["total_connections"] = max(0, self.stats["total_connections"] - 1)
            self.stats["active_sites"] = len(self.connections)
            
        except Exception as e:
            logger.error(f"失敗接続削除エラー: {e}")

    async def broadcast_to_all(self, message: Dict[str, Any]) -> int:
        """全接続にブロードキャスト"""
        try:
            total_sent = 0
            
            # 全サイトに送信
            for site_id in list(self.connections.keys()):
                sent_count = await self.send_to_site(site_id, {
                    **message,
                    "broadcast": True
                })
                total_sent += sent_count
            
            logger.info(f"全体ブロードキャスト完了: {total_sent}件送信")
            return total_sent
            
        except Exception as e:
            logger.error(f"ブロードキャストエラー: {e}")
            return 0

    async def send_to_subscribed(self, subscription_type: str, message: Dict[str, Any]) -> int:
        """特定の購読者にメッセージ送信"""
        try:
            sent_count = 0
            
            for site_connections in self.connections.values():
                for connection in site_connections:
                    if subscription_type in connection.subscriptions:
                        success = await self._send_to_connection_safe(
                            connection.websocket, message
                        )
                        if success:
                            sent_count += 1
            
            return sent_count
            
        except Exception as e:
            logger.error(f"購読者メッセージ送信エラー: {e}")
            return 0

    def has_connections(self, site_id: str) -> bool:
        """接続があるかチェック"""
        return site_id in self.connections and len(self.connections[site_id]) > 0

    def get_connection_count(self, site_id: Optional[str] = None) -> int:
        """接続数取得"""
        if site_id:
            return len(self.connections.get(site_id, []))
        return self.stats["total_connections"]

    def get_active_sites(self) -> List[str]:
        """アクティブサイト一覧"""
        return list(self.connections.keys())

    def get_stats(self) -> Dict[str, Any]:
        """統計情報取得"""
        return {
            **self.stats,
            "connections_by_site": {
                site_id: len(connections)
                for site_id, connections in self.connections.items()
            },
            "uptime_info": {
                site_id: {
                    "oldest_connection": min(
                        conn.connected_at for conn in connections
                    ).isoformat() if connections else None,
                    "newest_connection": max(
                        conn.connected_at for conn in connections
                    ).isoformat() if connections else None
                }
                for site_id, connections in self.connections.items()
            }
        }

    async def ping_all_connections(self) -> Dict[str, int]:
        """全接続にpingを送信"""
        try:
            ping_message = {
                "type": "ping",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            ping_results = {}
            
            for site_id in list(self.connections.keys()):
                sent_count = await self.send_to_site(site_id, ping_message)
                ping_results[site_id] = sent_count
            
            return ping_results
            
        except Exception as e:
            logger.error(f"ping送信エラー: {e}")
            return {}

    async def cleanup_stale_connections(self, max_age_hours: int = 24):
        """古い接続のクリーンアップ"""
        try:
            current_time = datetime.utcnow()
            removed_count = 0
            
            for site_id in list(self.connections.keys()):
                connections_to_remove = []
                
                for connection in self.connections[site_id]:
                    age = current_time - connection.connected_at
                    if age.total_seconds() > max_age_hours * 3600:
                        connections_to_remove.append(connection)
                
                # 古い接続を削除
                for connection in connections_to_remove:
                    await self._remove_failed_connection(connection)
                    removed_count += 1
            
            if removed_count > 0:
                logger.info(f"古い接続をクリーンアップ: {removed_count}件削除")
            
            return removed_count
            
        except Exception as e:
            logger.error(f"接続クリーンアップエラー: {e}")
            return 0

    async def handle_subscription(self, websocket: WebSocket, subscription_types: List[str]):
        """購読設定"""
        try:
            connection_info = self.connection_map.get(websocket)
            if connection_info:
                connection_info.subscriptions.update(subscription_types)
                
                await self.send_to_connection(websocket, {
                    "type": "subscription_updated",
                    "subscriptions": list(connection_info.subscriptions),
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                logger.debug(f"購読設定更新 ({connection_info.site_id}): {subscription_types}")
                
        except Exception as e:
            logger.error(f"購読設定エラー: {e}")

    async def handle_unsubscription(self, websocket: WebSocket, subscription_types: List[str]):
        """購読解除"""
        try:
            connection_info = self.connection_map.get(websocket)
            if connection_info:
                connection_info.subscriptions -= set(subscription_types)
                
                await self.send_to_connection(websocket, {
                    "type": "subscription_updated",
                    "subscriptions": list(connection_info.subscriptions),
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                logger.debug(f"購読解除 ({connection_info.site_id}): {subscription_types}")
                
        except Exception as e:
            logger.error(f"購読解除エラー: {e}")

    def get_connection_info(self, websocket: WebSocket) -> Optional[ConnectionInfo]:
        """接続情報取得"""
        return self.connection_map.get(websocket)

    async def send_heartbeat(self) -> int:
        """ハートビート送信"""
        try:
            heartbeat_message = {
                "type": "heartbeat",
                "server_time": datetime.utcnow().isoformat(),
                "stats": {
                    "total_connections": self.stats["total_connections"],
                    "active_sites": self.stats["active_sites"]
                }
            }
            
            return await self.broadcast_to_all(heartbeat_message)
            
        except Exception as e:
            logger.error(f"ハートビート送信エラー: {e}")
            return 0

    async def emergency_shutdown(self):
        """緊急シャットダウン"""
        try:
            shutdown_message = {
                "type": "server_shutdown",
                "message": "サーバーがシャットダウンします",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # 全接続に通知
            await self.broadcast_to_all(shutdown_message)
            
            # 少し待機してから強制切断
            await asyncio.sleep(1)
            
            # 全接続を閉じる
            for site_connections in self.connections.values():
                for connection in site_connections:
                    try:
                        await connection.websocket.close(code=1000, reason="Server shutdown")
                    except Exception:
                        pass  # 既に切断されている可能性
            
            # 接続情報をクリア
            self.connections.clear()
            self.connection_map.clear()
            self.stats["total_connections"] = 0
            self.stats["active_sites"] = 0
            
            logger.info("緊急シャットダウン完了")
            
        except Exception as e:
            logger.error(f"緊急シャットダウンエラー: {e}")

    def __len__(self) -> int:
        """接続数を返す"""
        return self.stats["total_connections"]

    def __contains__(self, site_id: str) -> bool:
        """サイトの接続があるかチェック"""
        return self.has_connections(site_id)

    def __str__(self) -> str:
        """文字列表現"""
        return f"WebSocketManager(connections={self.stats['total_connections']}, sites={self.stats['active_sites']})"