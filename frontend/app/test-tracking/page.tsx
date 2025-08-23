'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Box, 
  Alert,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Paper,
  LinearProgress,
  Tooltip,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  BugReport as BugIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Analytics as AnalyticsIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

// トラッキングイベントの型定義
interface TrackingEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  properties?: Record<string, any>;
  [key: string]: any;
}

// トラッカーインスタンスの型定義
interface TrackerInstance {
  init: (config: any) => void;
  track: (eventType: string, properties?: any) => void;
  page: (url?: string, title?: string, properties?: any) => void;
  identify: (userId: string, properties?: any) => void;
  setUserProperties: (properties: any) => void;
  flush: () => Promise<void>;
  reset: () => void;
  getSessionId: () => string;
  getUserId: () => string | null;
}

declare global {
  interface Window {
    aiAnalytics: TrackerInstance | any[];
  }
}

const TrackingTestPage: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // イベント自動生成の状態
  const [autoGenerate, setAutoGenerate] = useState(false);
  const autoGenerateRef = useRef<NodeJS.Timeout | null>(null);

  // フォーム入力値
  const [customEventName, setCustomEventName] = useState('button_click');
  const [customEventProps, setCustomEventProps] = useState('{\n  "button": "購入ボタン",\n  "price": 1980\n}');
  const [userIdInput, setUserIdInput] = useState('user-12345');
  const [userProps, setUserProps] = useState('{\n  "name": "山田太郎",\n  "email": "yamada@example.com",\n  "plan": "premium"\n}');

  // リファレンス
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // トラッカー初期化
  const initializeTracker = async () => {
    setStatus('loading');
    setStatusMessage('トラッキングタグを初期化しています...');

    try {
      // トラッキングスクリプトを動的に読み込み
      const script = document.createElement('script');
      script.src = '/tracking-tag/index.js';
      script.async = true;
      
      script.onload = () => {
        // トラッカーを初期化
        if (window.aiAnalytics) {
          const config = {
            projectId: 'demo-project',
            endpoint: '/api/collect',
            debug: true,
            sampleRate: 1.0,
            webVitals: true,
            errorTracking: true,
            batchSize: 5,
            flushInterval: 3000
          };

          if (Array.isArray(window.aiAnalytics)) {
            window.aiAnalytics.push(['init', config]);
          } else {
            window.aiAnalytics.init(config);
          }
          
          setIsInitialized(true);
          
          // セッションIDを取得
          setTimeout(() => {
            if (window.aiAnalytics && !Array.isArray(window.aiAnalytics)) {
              const sid = window.aiAnalytics.getSessionId?.();
              setSessionId(sid || '生成中...');
            }
          }, 100);
          
          setStatus('success');
          setStatusMessage('✅ トラッキングタグが正常に初期化されました');
          
          // 初回ページビューを送信
          trackPageView();
        }
      };
      
      script.onerror = () => {
        setStatus('error');
        setStatusMessage('❌ トラッキングスクリプトの読み込みに失敗しました');
      };
      
      document.head.appendChild(script);
    } catch (error) {
      setStatus('error');
      setStatusMessage(`初期化エラー: ${error}`);
    }
  };

  // ページビュー送信
  const trackPageView = () => {
    if (!isInitialized || !window.aiAnalytics || Array.isArray(window.aiAnalytics)) return;

    window.aiAnalytics.page('/test-tracking', 'トラッキングテストページ', {
      referrer: document.referrer || 'direct'
    });

    addEvent({
      type: 'pageview',
      timestamp: Date.now(),
      sessionId: sessionId,
      properties: {
        url: '/test-tracking',
        title: 'トラッキングテストページ'
      }
    });
  };

  // カスタムイベント送信
  const trackCustomEvent = () => {
    if (!isInitialized) {
      setStatus('error');
      setStatusMessage('トラッカーが初期化されていません');
      return;
    }

    try {
      const properties = JSON.parse(customEventProps);
      
      if (window.aiAnalytics && !Array.isArray(window.aiAnalytics)) {
        window.aiAnalytics.track(customEventName, properties);
      }

      addEvent({
        type: customEventName,
        timestamp: Date.now(),
        sessionId: sessionId,
        properties
      });

      setStatus('success');
      setStatusMessage(`✅ イベント「${customEventName}」を送信しました`);
    } catch (error) {
      setStatus('error');
      setStatusMessage('❌ プロパティのJSON形式が正しくありません');
    }
  };

  // ユーザー識別
  const identifyUser = () => {
    if (!isInitialized) {
      setStatus('error');
      setStatusMessage('トラッカーが初期化されていません');
      return;
    }

    try {
      const properties = JSON.parse(userProps);
      
      if (window.aiAnalytics && !Array.isArray(window.aiAnalytics)) {
        window.aiAnalytics.identify(userIdInput, properties);
      }

      setUserId(userIdInput);
      addEvent({
        type: 'identify',
        timestamp: Date.now(),
        sessionId: sessionId,
        userId: userIdInput,
        properties
      });

      setStatus('success');
      setStatusMessage(`✅ ユーザー「${userIdInput}」を識別しました`);
    } catch (error) {
      setStatus('error');
      setStatusMessage('❌ ユーザープロパティのJSON形式が正しくありません');
    }
  };

  // イベント送信
  const flushEvents = async () => {
    if (!isInitialized) return;

    try {
      if (window.aiAnalytics && !Array.isArray(window.aiAnalytics)) {
        await window.aiAnalytics.flush();
      }
      
      setStatus('success');
      setStatusMessage('✅ イベントをサーバーに送信しました');
    } catch (error) {
      setStatus('error');
      setStatusMessage(`❌ 送信エラー: ${error}`);
    }
  };

  // テストエラーを発生
  const triggerTestError = () => {
    try {
      throw new Error('テスト用のエラーです（分析システムで検知されます）');
    } catch (error) {
      console.error(error);
      addEvent({
        type: 'error',
        timestamp: Date.now(),
        sessionId: sessionId,
        properties: {
          message: 'テスト用のエラーです',
          stack: 'Error stack trace...'
        }
      });
    }
  };

  // イベントを追加
  const addEvent = (event: TrackingEvent) => {
    setEvents(prev => [...prev.slice(-50), event]); // 最新50件を保持
  };

  // イベントクリア
  const clearEvents = () => {
    setEvents([]);
  };

  // リセット
  const resetTracker = () => {
    if (window.aiAnalytics && !Array.isArray(window.aiAnalytics)) {
      window.aiAnalytics.reset();
    }
    
    setEvents([]);
    setSessionId('');
    setUserId('');
    setIsInitialized(false);
    setStatus('idle');
    setStatusMessage('トラッカーをリセットしました');
  };

  // 自動イベント生成
  useEffect(() => {
    if (autoGenerate && isInitialized) {
      autoGenerateRef.current = setInterval(() => {
        const eventTypes = [
          { type: 'click', props: { element: 'button', text: 'サンプルボタン' } },
          { type: 'scroll', props: { depth: Math.floor(Math.random() * 100) } },
          { type: 'view', props: { component: 'ProductCard', id: Math.floor(Math.random() * 1000) } }
        ];
        
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        addEvent({
          type: randomEvent.type,
          timestamp: Date.now(),
          sessionId: sessionId,
          properties: randomEvent.props
        });
      }, 2000);
    } else {
      if (autoGenerateRef.current) {
        clearInterval(autoGenerateRef.current);
      }
    }

    return () => {
      if (autoGenerateRef.current) {
        clearInterval(autoGenerateRef.current);
      }
    };
  }, [autoGenerate, isInitialized, sessionId]);

  // 最新イベントへスクロール
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // 埋め込みコードをコピー
  const copyEmbedCode = () => {
    const code = `<script src="https://your-domain.com/tracking-tag/index.js" async></script>
<script>
  window.aiAnalytics = window.aiAnalytics || [];
  window.aiAnalytics.push(['init', {
    projectId: 'your-project-id',
    endpoint: 'https://your-api.com/api/collect'
  }]);
</script>`;
    
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // タイムスタンプフォーマット
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP');
  };

  // イベントタイプの色
  const getEventColor = (type: string) => {
    const colors: Record<string, any> = {
      pageview: 'primary',
      click: 'secondary',
      identify: 'warning',
      error: 'error',
      scroll: 'info',
      view: 'success'
    };
    return colors[type] || 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          🚀 AI分析システム - トラッキングタグ動作確認
        </Typography>
        <Typography variant="body1" color="text.secondary">
          リアルタイムでトラッキングタグの動作を確認し、イベント送信をテストできます
        </Typography>
      </Box>

      {/* ステータスアラート */}
      {status !== 'idle' && (
        <Alert 
          severity={status === 'error' ? 'error' : status === 'success' ? 'success' : 'info'}
          sx={{ mb: 3 }}
          action={
            <IconButton size="small" onClick={() => setStatus('idle')}>
              <ClearIcon />
            </IconButton>
          }
        >
          {statusMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 左側：コントロールパネル */}
        <Grid item xs={12} lg={6}>
          {/* 初期化セクション */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">トラッカー初期化</Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip 
                    label={isInitialized ? '初期化済み' : '未初期化'} 
                    color={isInitialized ? 'success' : 'default'}
                    icon={isInitialized ? <CheckCircleIcon /> : <ErrorIcon />}
                    sx={{ mr: 2 }}
                  />
                  {sessionId && (
                    <Typography variant="caption" color="text.secondary">
                      セッションID: {sessionId}
                    </Typography>
                  )}
                </Box>
                {userId && (
                  <Typography variant="body2" color="text.secondary">
                    ユーザーID: {userId}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={initializeTracker}
                  disabled={isInitialized}
                  startIcon={<AnalyticsIcon />}
                >
                  初期化する
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={resetTracker}
                  disabled={!isInitialized}
                  startIcon={<RefreshIcon />}
                >
                  リセット
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* タブパネル */}
          <Card>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="イベント送信" />
              <Tab label="ユーザー識別" />
              <Tab label="埋め込みコード" />
            </Tabs>
            
            {/* イベント送信タブ */}
            {tabValue === 0 && (
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  カスタムイベントを送信
                </Typography>
                
                <TextField
                  fullWidth
                  label="イベント名"
                  value={customEventName}
                  onChange={(e) => setCustomEventName(e.target.value)}
                  placeholder="例: button_click, form_submit"
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="イベントプロパティ（JSON形式）"
                  value={customEventProps}
                  onChange={(e) => setCustomEventProps(e.target.value)}
                  multiline
                  rows={4}
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={trackCustomEvent}
                  disabled={!isInitialized || !customEventName}
                  startIcon={<SendIcon />}
                >
                  イベント送信
                </Button>
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  テストアクション
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={trackPageView}
                    disabled={!isInitialized}
                  >
                    ページビュー送信
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={triggerTestError}
                    disabled={!isInitialized}
                    startIcon={<BugIcon />}
                  >
                    テストエラー発生
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={flushEvents}
                    disabled={!isInitialized}
                  >
                    イベントを今すぐ送信
                  </Button>
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoGenerate}
                      onChange={(e) => setAutoGenerate(e.target.checked)}
                      disabled={!isInitialized}
                    />
                  }
                  label="自動でイベントを生成（2秒ごと）"
                  sx={{ mt: 2 }}
                />
              </CardContent>
            )}
            
            {/* ユーザー識別タブ */}
            {tabValue === 1 && (
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  ユーザー情報を設定
                </Typography>
                
                <TextField
                  fullWidth
                  label="ユーザーID"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="例: user-12345"
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="ユーザープロパティ（JSON形式）"
                  value={userProps}
                  onChange={(e) => setUserProps(e.target.value)}
                  multiline
                  rows={5}
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={identifyUser}
                  disabled={!isInitialized || !userIdInput}
                  startIcon={<PersonIcon />}
                >
                  ユーザー識別
                </Button>
              </CardContent>
            )}
            
            {/* 埋め込みコードタブ */}
            {tabValue === 2 && (
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  あなたのサイトに埋め込むコード
                </Typography>
                
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    overflow: 'auto'
                  }}
                >
                  <pre style={{ margin: 0 }}>
{`<script src="https://your-domain.com/tracking-tag/index.js" async></script>
<script>
  window.aiAnalytics = window.aiAnalytics || [];
  window.aiAnalytics.push(['init', {
    projectId: 'your-project-id',
    endpoint: 'https://your-api.com/api/collect'
  }]);
</script>`}
                  </pre>
                </Paper>
                
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={copyEmbedCode}
                  startIcon={copiedCode ? <CheckCircleIcon /> : <CopyIcon />}
                  sx={{ mt: 2 }}
                  color={copiedCode ? 'success' : 'primary'}
                >
                  {copiedCode ? 'コピーしました！' : 'コードをコピー'}
                </Button>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  このコードを&lt;head&gt;タグ内に追加することで、自動的にページビューやエラーの追跡が開始されます。
                </Alert>
              </CardContent>
            )}
          </Card>
        </Grid>

        {/* 右側：イベントモニター */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '800px', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  リアルタイムイベントログ（{events.length}件）
                </Typography>
                <Tooltip title="ログをクリア">
                  <IconButton onClick={clearEvents}>
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
            
            <Divider />
            
            <Box 
              sx={{ 
                flexGrow: 1, 
                overflow: 'auto', 
                p: 2,
                bgcolor: 'grey.50'
              }}
            >
              {events.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">
                    まだイベントがありません
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    トラッカーを初期化してイベントを送信してみましょう
                  </Typography>
                </Box>
              ) : (
                events.map((event, index) => (
                  <Paper 
                    key={index} 
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      bgcolor: 'background.paper'
                    }}
                    elevation={1}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={event.type} 
                        color={getEventColor(event.type)}
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(event.timestamp)}
                      </Typography>
                    </Box>
                    
                    {event.userId && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <PersonIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        {event.userId}
                      </Typography>
                    )}
                    
                    {event.properties && Object.keys(event.properties).length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          プロパティ:
                        </Typography>
                        <Paper sx={{ p: 1, bgcolor: 'grey.100' }}>
                          <pre style={{ 
                            margin: 0, 
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                          }}>
                            {JSON.stringify(event.properties, null, 2)}
                          </pre>
                        </Paper>
                      </Box>
                    )}
                  </Paper>
                ))
              )}
              <div ref={eventsEndRef} />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* サマリー統計 */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            イベント統計
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {events.filter(e => e.type === 'pageview').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ページビュー
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {events.filter(e => e.type === 'click' || e.type === 'button_click').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  クリック
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {events.filter(e => e.type === 'identify').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ユーザー識別
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error">
                  {events.filter(e => e.type === 'error').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  エラー
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TrackingTestPage;