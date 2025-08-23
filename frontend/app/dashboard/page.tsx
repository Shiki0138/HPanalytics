'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  Alert,
  AlertTitle,
  Tab,
  Tabs,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  LinearProgress,
  useTheme,
  alpha,
  Divider,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Lightbulb,
  Speed,
  People,
  DevicesOther,
  Language,
  ShoppingCart,
  School,
  Business,
  LocalHospital,
  Restaurant,
  CalendarToday,
  DateRange,
  Refresh,
  Download,
  AutoAwesome,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'

// コンポーネントのインポート
import MainLayout from '@/components/layout/MainLayout'
// import ProtectedRoute from '@/components/common/ProtectedRoute'
import TimeSeriesChart from '@/components/charts/TimeSeriesChart'
import BarChart from '@/components/charts/BarChart'
import DonutChart from '@/components/charts/DonutChart'

// 業態タイプ
type BusinessType = 'ec' | 'corporate' | 'media' | 'education' | 'medical' | 'restaurant' | 'general'

// 改善提案タイプ
interface ImprovementSuggestion {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  metric: string
  currentValue: number
  targetValue: number
  estimatedImprovement: string
  actions: string[]
}

// リアルタイムデータタイプ
interface RealtimeMetric {
  label: string
  value: number
  change: number
  status: 'good' | 'warning' | 'critical'
  icon: React.ReactNode
}

export default function DashboardPage() {
  const theme = useTheme()
  
  // 状態管理
  const [businessType, setBusinessType] = useState<BusinessType>('general')
  const [timeRange, setTimeRange] = useState<'realtime' | 'day' | 'week' | 'month' | 'custom'>('realtime')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState(0)
  const [showAISuggestions, setShowAISuggestions] = useState(true)

  // 業態別の重要指標設定
  const businessMetrics = useMemo(() => {
    const metricsMap: Record<BusinessType, string[]> = {
      ec: ['conversion_rate', 'cart_abandonment', 'average_order_value', 'checkout_flow'],
      corporate: ['lead_generation', 'contact_form', 'document_downloads', 'company_info_views'],
      media: ['article_reads', 'scroll_depth', 'share_rate', 'return_visitors'],
      education: ['course_completion', 'video_watch_time', 'quiz_results', 'enrollment_rate'],
      medical: ['appointment_bookings', 'service_inquiries', 'location_searches', 'emergency_access'],
      restaurant: ['menu_views', 'reservation_rate', 'location_clicks', 'phone_calls'],
      general: ['bounce_rate', 'session_duration', 'page_views', 'new_vs_returning']
    }
    return metricsMap[businessType]
  }, [businessType])

  // リアルタイムメトリクス
  const realtimeMetrics: RealtimeMetric[] = useMemo(() => [
    {
      label: '現在の訪問者',
      value: 127,
      change: 15,
      status: 'good',
      icon: <People />
    },
    {
      label: '直近1時間のPV',
      value: 1543,
      change: -8,
      status: 'warning',
      icon: <Speed />
    },
    {
      label: 'コンバージョン率',
      value: 3.2,
      change: 0.5,
      status: 'good',
      icon: <ShoppingCart />
    },
    {
      label: '平均滞在時間',
      value: 245,
      change: 12,
      status: 'good',
      icon: <CalendarToday />
    }
  ], [])

  // AI改善提案
  const improvementSuggestions: ImprovementSuggestion[] = useMemo(() => {
    const basesuggestions = [
      {
        id: '1',
        title: 'モバイルページの表示速度改善',
        description: 'モバイルユーザーの直帰率が高い原因は、ページ読み込み時間（平均4.2秒）にあります。',
        impact: 'high' as const,
        difficulty: 'medium' as const,
        category: 'performance',
        metric: '直帰率',
        currentValue: 68,
        targetValue: 45,
        estimatedImprovement: '売上+15%',
        actions: [
          '画像の遅延読み込みを実装',
          'CSSとJavaScriptの最小化',
          'CDNの導入を検討'
        ]
      },
      {
        id: '2',
        title: '商品詳細ページのCTA改善',
        description: '「カートに追加」ボタンのクリック率が業界平均を下回っています。',
        impact: 'high' as const,
        difficulty: 'easy' as const,
        category: 'conversion',
        metric: 'CTAクリック率',
        currentValue: 2.1,
        targetValue: 3.5,
        estimatedImprovement: 'コンバージョン+20%',
        actions: [
          'ボタンの色を緑色に変更',
          'ボタンサイズを20%拡大',
          'ボタン周辺に緊急性を示すテキストを追加'
        ]
      },
      {
        id: '3',
        title: '新規訪問者の再訪率向上',
        description: '初回訪問者の85%が二度と戻ってきていません。',
        impact: 'medium' as const,
        difficulty: 'medium' as const,
        category: 'engagement',
        metric: '再訪率',
        currentValue: 15,
        targetValue: 30,
        estimatedImprovement: 'LTV+25%',
        actions: [
          'メールマガジン登録の促進',
          '初回購入割引の提供',
          'プッシュ通知の実装'
        ]
      }
    ]

    // 業態別の提案を追加
    if (businessType === 'ec') {
      basesuggestions.push({
        id: '4',
        title: 'カート放棄率の削減',
        description: 'カートに商品を入れた後、70%のユーザーが購入を完了していません。',
        impact: 'high' as const,
        difficulty: 'medium' as const,
        category: 'conversion',
        metric: 'カート放棄率',
        currentValue: 70,
        targetValue: 50,
        estimatedImprovement: '売上+30%',
        actions: [
          '送料無料の閾値を明確に表示',
          'ゲスト購入オプションの追加',
          'カート放棄メールの自動送信'
        ]
      })
    }

    return basesuggestions
  }, [businessType])

  // 時間範囲の切り替え
  const handleTimeRangeChange = (range: typeof timeRange) => {
    setTimeRange(range)
    // ここで実際のデータ取得処理を行う
  }

  // 改善提案の実装難易度に応じた色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success'
      case 'medium': return 'warning'
      case 'hard': return 'error'
      default: return 'default'
    }
  }

  // インパクトに応じたアイコン
  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <ArrowUpward />
      case 'medium': return <TrendingUp />
      case 'low': return <ArrowDownward />
      default: return null
    }
  }

  return (
    // <ProtectedRoute>
      <MainLayout>
        <Box sx={{ p: 3 }}>
          {/* ヘッダー */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
              サイト分析ダッシュボード
            </Typography>
            <Typography variant="body1" color="text.secondary">
              改善提案と実行可能なインサイトを提供します
            </Typography>
          </Box>

          {/* 業態選択とコントロール */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">業態:</Typography>
              <ButtonGroup size="small">
                <Tooltip title="ECサイト">
                  <Button 
                    variant={businessType === 'ec' ? 'contained' : 'outlined'}
                    onClick={() => setBusinessType('ec')}
                  >
                    <ShoppingCart fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="企業サイト">
                  <Button 
                    variant={businessType === 'corporate' ? 'contained' : 'outlined'}
                    onClick={() => setBusinessType('corporate')}
                  >
                    <Business fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="メディア">
                  <Button 
                    variant={businessType === 'media' ? 'contained' : 'outlined'}
                    onClick={() => setBusinessType('media')}
                  >
                    <School fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="医療">
                  <Button 
                    variant={businessType === 'medical' ? 'contained' : 'outlined'}
                    onClick={() => setBusinessType('medical')}
                  >
                    <LocalHospital fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="飲食">
                  <Button 
                    variant={businessType === 'restaurant' ? 'contained' : 'outlined'}
                    onClick={() => setBusinessType('restaurant')}
                  >
                    <Restaurant fontSize="small" />
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <ButtonGroup size="small">
                <Button 
                  variant={timeRange === 'realtime' ? 'contained' : 'outlined'}
                  onClick={() => handleTimeRangeChange('realtime')}
                >
                  リアルタイム
                </Button>
                <Button 
                  variant={timeRange === 'day' ? 'contained' : 'outlined'}
                  onClick={() => handleTimeRangeChange('day')}
                >
                  日次
                </Button>
                <Button 
                  variant={timeRange === 'week' ? 'contained' : 'outlined'}
                  onClick={() => handleTimeRangeChange('week')}
                >
                  週次
                </Button>
                <Button 
                  variant={timeRange === 'month' ? 'contained' : 'outlined'}
                  onClick={() => handleTimeRangeChange('month')}
                >
                  月次
                </Button>
              </ButtonGroup>
              <IconButton size="small">
                <Refresh />
              </IconButton>
              <IconButton size="small">
                <Download />
              </IconButton>
            </Box>
          </Box>

          {/* AI改善提案アラート */}
          {showAISuggestions && (
            <Alert 
              severity="info" 
              sx={{ mb: 3 }}
              icon={<AutoAwesome />}
              action={
                <Button size="small" onClick={() => setShowAISuggestions(false)}>
                  非表示
                </Button>
              }
            >
              <AlertTitle>AI分析による改善提案</AlertTitle>
              過去30日間のデータ分析により、{improvementSuggestions.length}件の改善機会を発見しました。
              実装により推定{improvementSuggestions.reduce((acc, s) => {
                const match = s.estimatedImprovement.match(/\+(\d+)%/)
                return acc + (match ? parseInt(match[1]) : 0)
              }, 0)}%の成果向上が見込まれます。
            </Alert>
          )}

          {/* メインコンテンツ */}
          <Grid container spacing={3}>
            {/* リアルタイムメトリクス */}
            {timeRange === 'realtime' && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  リアルタイム状況
                </Typography>
                <Grid container spacing={2}>
                  {realtimeMetrics.map((metric, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Box sx={{ color: theme.palette.primary.main }}>
                                {metric.icon}
                              </Box>
                              <Chip
                                label={`${metric.change > 0 ? '+' : ''}${metric.change}%`}
                                size="small"
                                color={metric.change > 0 ? 'success' : 'error'}
                              />
                            </Box>
                            <Typography variant="h4" gutterBottom>
                              {metric.label === '平均滞在時間' 
                                ? `${Math.floor(metric.value / 60)}:${(metric.value % 60).toString().padStart(2, '0')}`
                                : metric.label === 'コンバージョン率'
                                ? `${metric.value}%`
                                : metric.value.toLocaleString()
                              }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {metric.label}
                            </Typography>
                            {metric.status === 'warning' && (
                              <Box sx={{ mt: 1 }}>
                                <Warning fontSize="small" color="warning" />
                                <Typography variant="caption" color="warning.main" sx={{ ml: 0.5 }}>
                                  要注意
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* 改善提案カード */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      改善提案
                    </Typography>
                    <Badge badgeContent={improvementSuggestions.length} color="primary">
                      <Lightbulb />
                    </Badge>
                  </Box>
                  
                  <List>
                    {improvementSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ListItem
                          sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 2,
                            mb: 2,
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.04)
                            }
                          }}
                        >
                          <Box sx={{ width: '100%', mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {suggestion.title}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Chip
                                  label={suggestion.impact}
                                  size="small"
                                  icon={getImpactIcon(suggestion.impact)}
                                />
                                <Chip
                                  label={suggestion.difficulty}
                                  size="small"
                                  color={getDifficultyColor(suggestion.difficulty)}
                                />
                              </Box>
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {suggestion.description}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="caption">
                                {suggestion.metric}: {suggestion.currentValue}% → {suggestion.targetValue}%
                              </Typography>
                              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                                {suggestion.estimatedImprovement}
                              </Typography>
                            </Box>
                            
                            <LinearProgress 
                              variant="determinate" 
                              value={(suggestion.currentValue / suggestion.targetValue) * 100}
                              sx={{ mb: 1, height: 6, borderRadius: 3 }}
                            />
                            
                            <details>
                              <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: theme.palette.primary.main }}>
                                実施すべきアクション
                              </summary>
                              <List dense sx={{ mt: 1 }}>
                                {suggestion.actions.map((action, idx) => (
                                  <ListItem key={idx} sx={{ pl: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                      <CheckCircle fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={action}
                                      primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </details>
                          </Box>
                        </ListItem>
                      </motion.div>
                    ))}
                  </List>
                  
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    すべての提案を見る
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* 重要指標グラフ */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                    <Tab label="トラフィック分析" />
                    <Tab label="ユーザー行動" />
                    <Tab label="コンバージョン" />
                    <Tab label="技術指標" />
                  </Tabs>

                  {/* トラフィック分析タブ */}
                  {activeTab === 0 && (
                    <Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            訪問者数の推移
                          </Typography>
                          <TimeSeriesChart
                            data={Array.from({ length: 30 }, (_, i) => ({
                              date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
                              visitors: Math.floor(Math.random() * 1000) + 500,
                              pageviews: Math.floor(Math.random() * 2000) + 1000,
                            }))}
                            metrics={['visitors', 'pageviews']}
                            height={300}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            流入元
                          </Typography>
                          <DonutChart
                            data={[
                              { name: '検索エンジン', value: 45, color: theme.palette.primary.main },
                              { name: 'SNS', value: 25, color: theme.palette.secondary.main },
                              { name: '直接アクセス', value: 20, color: theme.palette.info.main },
                              { name: 'リファラル', value: 10, color: theme.palette.warning.main },
                            ]}
                            height={250}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            デバイス別
                          </Typography>
                          <BarChart
                            data={[
                              { name: 'モバイル', value: 65, change: 12 },
                              { name: 'デスクトップ', value: 30, change: -5 },
                              { name: 'タブレット', value: 5, change: 0 },
                            ]}
                            height={250}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* ユーザー行動タブ */}
                  {activeTab === 1 && (
                    <Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              人気ページTOP5
                            </Typography>
                            <List dense>
                              {[
                                { path: '/products/best-seller', views: 5432, time: '2:45' },
                                { path: '/about', views: 3210, time: '1:30' },
                                { path: '/contact', views: 2156, time: '0:45' },
                                { path: '/blog/new-release', views: 1987, time: '3:20' },
                                { path: '/faq', views: 1543, time: '2:10' },
                              ].map((page, index) => (
                                <ListItem key={index} sx={{ px: 0 }}>
                                  <ListItemText
                                    primary={page.path}
                                    secondary={`${page.views.toLocaleString()} views • 平均${page.time}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              ユーザーフロー分析
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                最も一般的な経路:
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Chip label="トップページ" size="small" />
                                <TrendingUp fontSize="small" />
                                <Chip label="商品一覧" size="small" />
                                <TrendingUp fontSize="small" />
                                <Chip label="商品詳細" size="small" />
                                <TrendingUp fontSize="small" />
                                <Chip label="カート" size="small" color="primary" />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                このフローの完了率: 24%
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* コンバージョンタブ */}
                  {activeTab === 2 && (
                    <Box>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        コンバージョン率が前週比で12%低下しています。モバイルユーザーのチェックアウトプロセスに問題がある可能性があります。
                      </Alert>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h3" color="primary">
                              2.8%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              総コンバージョン率
                            </Typography>
                            <Chip 
                              label="-0.4%" 
                              size="small" 
                              color="error"
                              sx={{ mt: 1 }}
                            />
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h3" color="secondary">
                              ¥4,250
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              平均注文額
                            </Typography>
                            <Chip 
                              label="+8%" 
                              size="small" 
                              color="success"
                              sx={{ mt: 1 }}
                            />
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h3" color="warning.main">
                              68%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              カート放棄率
                            </Typography>
                            <Chip 
                              label="+5%" 
                              size="small" 
                              color="error"
                              sx={{ mt: 1 }}
                            />
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* 技術指標タブ */}
                  {activeTab === 3 && (
                    <Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            ページ速度スコア
                          </Typography>
                          <List>
                            {[
                              { label: 'First Contentful Paint', value: 1.8, target: 1.8, unit: 's' },
                              { label: 'Largest Contentful Paint', value: 4.2, target: 2.5, unit: 's' },
                              { label: 'Total Blocking Time', value: 350, target: 200, unit: 'ms' },
                              { label: 'Cumulative Layout Shift', value: 0.15, target: 0.1, unit: '' },
                            ].map((metric, index) => (
                              <ListItem key={index}>
                                <ListItemText
                                  primary={metric.label}
                                  secondary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <LinearProgress
                                        variant="determinate"
                                        value={Math.min((metric.target / metric.value) * 100, 100)}
                                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                        color={metric.value <= metric.target ? 'success' : 'error'}
                                      />
                                      <Typography variant="caption">
                                        {metric.value}{metric.unit}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            エラー発生状況
                          </Typography>
                          <Paper sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Typography variant="body2">JavaScript エラー</Typography>
                              <Typography variant="body2" color="error">23件/日</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Typography variant="body2">404 エラー</Typography>
                              <Typography variant="body2" color="warning.main">45件/日</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">API タイムアウト</Typography>
                              <Typography variant="body2" color="success.main">2件/日</Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* 業態別インサイト */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {businessType === 'ec' && 'ECサイト向け重要指標'}
                    {businessType === 'corporate' && '企業サイト向け重要指標'}
                    {businessType === 'media' && 'メディアサイト向け重要指標'}
                    {businessType === 'medical' && '医療機関向け重要指標'}
                    {businessType === 'restaurant' && '飲食店向け重要指標'}
                    {businessType === 'general' && '一般的な重要指標'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {businessMetrics.map((metric, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h5">
                            {Math.floor(Math.random() * 100)}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {metric.replace(/_/g, ' ')}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </MainLayout>
    // </ProtectedRoute>
  )
}