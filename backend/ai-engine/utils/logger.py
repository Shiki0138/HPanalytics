"""
ログ設定ユーティリティ
"""
import logging
import logging.handlers
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

def setup_logger(
    name: Optional[str] = None,
    level: str = "INFO",
    log_file: Optional[str] = None,
    max_size: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
    format_string: Optional[str] = None
) -> logging.Logger:
    """
    ログセットアップ
    
    Args:
        name: ロガー名 (Noneの場合はrootロガー)
        level: ログレベル
        log_file: ログファイルパス
        max_size: ログファイル最大サイズ
        backup_count: バックアップファイル数
        format_string: ログフォーマット
        
    Returns:
        設定済みロガー
    """
    
    # ロガー取得
    logger = logging.getLogger(name)
    
    # 既に設定済みの場合はそのまま返す
    if logger.handlers:
        return logger
    
    # ログレベル設定
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # フォーマット設定
    if not format_string:
        format_string = (
            "[%(asctime)s] %(levelname)s in %(name)s: %(message)s "
            "(%(filename)s:%(lineno)d)"
        )
    
    formatter = logging.Formatter(
        format_string,
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # コンソールハンドラー
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # ファイルハンドラー（指定された場合）
    if log_file:
        # ログディレクトリ作成
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # ローテーティングファイルハンドラー
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

def setup_structured_logger(
    name: Optional[str] = None,
    level: str = "INFO",
    log_file: Optional[str] = None
) -> logging.Logger:
    """
    構造化ログセットアップ（JSON形式）
    
    Args:
        name: ロガー名
        level: ログレベル
        log_file: ログファイルパス
        
    Returns:
        設定済みロガー
    """
    import json
    from pythonjsonlogger import jsonlogger
    
    logger = logging.getLogger(name)
    
    if logger.handlers:
        return logger
    
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # JSON フォーマッター
    json_formatter = jsonlogger.JsonFormatter(
        fmt='%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # コンソールハンドラー
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(json_formatter)
    logger.addHandler(console_handler)
    
    # ファイルハンドラー
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(json_formatter)
        logger.addHandler(file_handler)
    
    return logger

class RequestIDFilter(logging.Filter):
    """リクエストID付与フィルター"""
    
    def filter(self, record):
        # リクエストIDがある場合は付与
        # FastAPIのcontextvarやasyncio.Task.current_task()を使用して
        # リクエスト固有のIDを設定可能
        if not hasattr(record, 'request_id'):
            record.request_id = 'no-request'
        return True

class PerformanceLogger:
    """パフォーマンス計測用ロガー"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def log_performance(self, operation: str, duration: float, **kwargs):
        """パフォーマンス情報をログ出力"""
        self.logger.info(
            f"Performance: {operation}",
            extra={
                'operation': operation,
                'duration_ms': duration * 1000,
                'performance_data': kwargs
            }
        )
    
    def log_database_query(self, query_type: str, duration: float, rows: int = None):
        """データベースクエリ情報をログ出力"""
        extra_data = {
            'query_type': query_type,
            'duration_ms': duration * 1000
        }
        
        if rows is not None:
            extra_data['rows_affected'] = rows
        
        self.logger.info(
            f"Database Query: {query_type}",
            extra=extra_data
        )
    
    def log_external_api_call(self, api_name: str, duration: float, status_code: int):
        """外部API呼び出し情報をログ出力"""
        self.logger.info(
            f"External API: {api_name}",
            extra={
                'api_name': api_name,
                'duration_ms': duration * 1000,
                'status_code': status_code
            }
        )

class SecurityLogger:
    """セキュリティ関連ログ専用ロガー"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def log_authentication_attempt(self, user_id: str, success: bool, ip_address: str):
        """認証試行をログ出力"""
        level = logging.INFO if success else logging.WARNING
        message = f"Authentication {'SUCCESS' if success else 'FAILED'}: {user_id}"
        
        self.logger.log(level, message, extra={
            'event_type': 'authentication',
            'user_id': user_id,
            'success': success,
            'ip_address': ip_address,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def log_authorization_failure(self, user_id: str, resource: str, action: str):
        """認可失敗をログ出力"""
        self.logger.warning(
            f"Authorization DENIED: {user_id} tried to {action} {resource}",
            extra={
                'event_type': 'authorization_failure',
                'user_id': user_id,
                'resource': resource,
                'action': action,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
    
    def log_suspicious_activity(self, description: str, user_id: str = None, ip_address: str = None):
        """不審な活動をログ出力"""
        self.logger.error(
            f"Suspicious Activity: {description}",
            extra={
                'event_type': 'suspicious_activity',
                'description': description,
                'user_id': user_id,
                'ip_address': ip_address,
                'timestamp': datetime.utcnow().isoformat()
            }
        )

def setup_application_logger():
    """アプリケーション用の統合ログ設定"""
    
    # ログディレクトリ作成
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # メインアプリケーションログ
    app_logger = setup_logger(
        name="ai_analytics_app",
        level="INFO",
        log_file="logs/app.log"
    )
    
    # エラーログ（ERROR以上のみ）
    error_logger = setup_logger(
        name="ai_analytics_error",
        level="ERROR",
        log_file="logs/error.log"
    )
    
    # パフォーマンスログ
    perf_logger = setup_logger(
        name="ai_analytics_performance",
        level="INFO",
        log_file="logs/performance.log"
    )
    
    # セキュリティログ
    security_logger = setup_logger(
        name="ai_analytics_security",
        level="INFO",
        log_file="logs/security.log"
    )
    
    # WebSocketログ
    websocket_logger = setup_logger(
        name="ai_analytics_websocket",
        level="INFO",
        log_file="logs/websocket.log"
    )
    
    # リアルタイム処理ログ
    realtime_logger = setup_logger(
        name="ai_analytics_realtime",
        level="INFO",
        log_file="logs/realtime.log"
    )
    
    return {
        'app': app_logger,
        'error': error_logger,
        'performance': perf_logger,
        'security': security_logger,
        'websocket': websocket_logger,
        'realtime': realtime_logger
    }

# ログ設定のサンプル使用
if __name__ == "__main__":
    # 基本ログ設定
    logger = setup_logger(
        name="test_logger",
        level="DEBUG",
        log_file="test.log"
    )
    
    logger.debug("デバッグメッセージ")
    logger.info("情報メッセージ")
    logger.warning("警告メッセージ")
    logger.error("エラーメッセージ")
    
    # パフォーマンスログ使用例
    perf_logger = PerformanceLogger(logger)
    perf_logger.log_performance("test_operation", 0.123, param1="value1")
    
    # セキュリティログ使用例
    sec_logger = SecurityLogger(logger)
    sec_logger.log_authentication_attempt("user123", True, "192.168.1.1")
    
    print("ログ設定テスト完了")