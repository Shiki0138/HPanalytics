const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);
  
  if (req.url === '/') {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>AI Analytics System Test</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #f5f5f5;
      padding: 30px;
      border-radius: 10px;
      margin: 20px 0;
    }
    button {
      background: #007bff;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin: 5px;
    }
    button:hover {
      background: #0056b3;
    }
    .log {
      background: #000;
      color: #0f0;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 20px;
    }
    .status {
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
    .info { background: #d1ecf1; color: #0c5460; }
  </style>
</head>
<body>
  <h1>🚀 AI Analytics System - 動作確認</h1>
  
  <div class="container">
    <h2>1. 埋め込みタグテスト</h2>
    <p>このページには分析タグが埋め込まれています。</p>
    <div id="tagStatus" class="status info">タグ読み込み中...</div>
    <button onclick="trackEvent()">イベント送信</button>
    <button onclick="identifyUser()">ユーザー識別</button>
    <button onclick="trackPageView()">ページビュー送信</button>
  </div>

  <div class="container">
    <h2>2. システム機能</h2>
    <p>各機能へのリンク:</p>
    <ul>
      <li><a href="/dashboard" target="_blank">分析ダッシュボード</a></li>
      <li><a href="/test-tracking" target="_blank">トラッキングデモ</a></li>
      <li><a href="/login" target="_blank">ログインページ</a></li>
    </ul>
  </div>

  <div class="container">
    <h2>3. リアルタイムログ</h2>
    <div id="log" class="log">ログ出力がここに表示されます...</div>
  </div>

  <!-- トラッキングタグの埋め込み -->
  <script src="/tracking-tag/index.js"></script>
  <script>
    // グローバル変数の初期化
    window.aiAnalytics = window.aiAnalytics || [];
    
    // ログ出力関数
    function addLog(message, type = 'info') {
      const log = document.getElementById('log');
      const time = new Date().toLocaleTimeString();
      const color = type === 'error' ? '#f00' : type === 'success' ? '#0f0' : '#0ff';
      log.innerHTML += \`<div style="color: \${color}">[\${time}] \${message}</div>\`;
      log.scrollTop = log.scrollHeight;
    }

    // タグ初期化
    window.onload = function() {
      try {
        window.aiAnalytics.push(['init', {
          projectId: 'test-project',
          endpoint: '/api/collect',
          debug: true
        }]);
        
        document.getElementById('tagStatus').className = 'status success';
        document.getElementById('tagStatus').textContent = '✅ タグが正常に読み込まれました';
        addLog('トラッキングタグを初期化しました', 'success');
      } catch (error) {
        document.getElementById('tagStatus').className = 'status error';
        document.getElementById('tagStatus').textContent = '❌ タグの読み込みに失敗しました';
        addLog('エラー: ' + error.message, 'error');
      }
    };

    // イベント送信
    function trackEvent() {
      try {
        window.aiAnalytics.track('test_event', {
          category: 'test',
          action: 'click',
          value: Math.random()
        });
        addLog('イベントを送信しました: test_event', 'success');
      } catch (error) {
        addLog('イベント送信エラー: ' + error.message, 'error');
      }
    }

    // ユーザー識別
    function identifyUser() {
      try {
        const userId = 'test-user-' + Date.now();
        window.aiAnalytics.identify(userId, {
          name: 'テストユーザー',
          email: 'test@example.com'
        });
        addLog('ユーザーを識別しました: ' + userId, 'success');
      } catch (error) {
        addLog('ユーザー識別エラー: ' + error.message, 'error');
      }
    }

    // ページビュー送信
    function trackPageView() {
      try {
        window.aiAnalytics.page('/test-page', 'テストページ', {
          referrer: document.referrer
        });
        addLog('ページビューを送信しました', 'success');
      } catch (error) {
        addLog('ページビュー送信エラー: ' + error.message, 'error');
      }
    }

    // コンソール出力をキャプチャ
    const originalLog = console.log;
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Analytics')) {
        addLog('Console: ' + args.join(' '));
      }
      originalLog.apply(console, args);
    };
  </script>
</body>
</html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } 
  else if (req.url === '/tracking-tag/index.js') {
    // トラッキングタグを提供
    const tagPath = path.join(__dirname, 'public', 'tracking-tag', 'index.js');
    fs.readFile(tagPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Tracking tag not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(data);
      }
    });
  }
  else if (req.url === '/api/collect') {
    // データ収集エンドポイント
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log('Received tracking data:', body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', received: true }));
    });
  }
  else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`
==================================================
🚀 AI Analytics Test Server
==================================================
サーバーが起動しました！

ブラウザで以下のURLを開いてください:
http://localhost:${PORT}

機能:
- トラッキングタグの動作確認
- イベント送信テスト
- リアルタイムログ表示
==================================================
  `);
});