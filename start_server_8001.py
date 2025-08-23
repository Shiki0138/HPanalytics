#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

# Change to public directory
os.chdir('public')

PORT = 8001
Handler = http.server.SimpleHTTPRequestHandler

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🚀 市場最強売上分析システム が起動しました！")
        print(f"")
        print(f"📊 完全版ダッシュボード: http://localhost:{PORT}/analytics.html")
        print(f"📈 シンプル版: http://localhost:{PORT}/index.html") 
        print(f"")
        print(f"サーバーを停止するには Ctrl+C を押してください")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n👋 サーバーを停止しました")
except OSError as e:
    if "Address already in use" in str(e):
        print(f"❌ ポート {PORT} は既に使用中です。別のポートを使用するか、実行中のサーバーを停止してください。")
    else:
        print(f"❌ エラー: {e}")
    sys.exit(1)