'use client'

import React, { useState } from 'react'
import { Box, Container, Typography, Paper, Button, Grid, Card, CardContent, LinearProgress, Chip, Avatar, IconButton, Fade, Grow } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PeopleIcon from '@mui/icons-material/People'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

interface QuickAction {
  id: string
  title: string
  impact: string
  status: 'ready' | 'processing' | 'completed'
}

const SimpleDashboard: React.FC = () => {
  const [activeFunction, setActiveFunction] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])

  // ワンクリック機能の実行
  const executeOneClick = (functionType: string) => {
    setActiveFunction(functionType)
    setProcessing(true)
    
    // シミュレーション：2秒後に結果表示
    setTimeout(() => {
      setProcessing(false)
      
      switch(functionType) {
        case 'revenue':
          setQuickActions([
            { id: '1', title: 'カート放棄率を15%削減', impact: '+¥234,000/月', status: 'ready' },
            { id: '2', title: '関連商品レコメンド最適化', impact: '+¥156,000/月', status: 'ready' },
            { id: '3', title: '価格設定を5%調整', impact: '+¥89,000/月', status: 'ready' }
          ])
          break
        case 'customer':
          setQuickActions([
            { id: '4', title: 'VIP顧客に特別オファー送信', impact: '離脱防止率85%', status: 'ready' },
            { id: '5', title: '休眠顧客の再活性化', impact: '1,234名が対象', status: 'ready' },
            { id: '6', title: '新規顧客の定着プログラム', impact: 'LTV 2.3倍向上', status: 'ready' }
          ])
          break
        case 'optimize':
          setQuickActions([
            { id: '7', title: 'AI自動価格調整を開始', impact: '利益率+12%', status: 'ready' },
            { id: '8', title: '在庫最適化を実行', impact: '在庫コスト-23%', status: 'ready' },
            { id: '9', title: '広告予算を自動配分', impact: 'ROI 340%達成', status: 'ready' }
          ])
          break
      }
    }, 2000)
  }

  // アクションの実行
  const executeAction = (actionId: string) => {
    setQuickActions(prev => 
      prev.map(action => 
        action.id === actionId 
          ? { ...action, status: 'processing' as const }
          : action
      )
    )
    
    // 3秒後に完了
    setTimeout(() => {
      setQuickActions(prev => 
        prev.map(action => 
          action.id === actionId 
            ? { ...action, status: 'completed' as const }
            : action
        )
      )
    }, 3000)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" sx={{ mb: 2, fontWeight: 'bold' }}>
          AI売上最適化システム
        </Typography>
        <Typography variant="h6" color="text.secondary">
          ワンクリックで売上を向上させましょう
        </Typography>
      </Box>

      {/* 現在の状況 */}
      <Paper sx={{ p: 4, mb: 6, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ mb: 1 }}>今月の売上</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              ¥12,345,678
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              前月比 +8.3%
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ mb: 1 }}>AI予測</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              +¥2,100,000
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              改善可能額
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ mb: 1 }}>成功率</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              92%
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              提案実行率
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* ワンクリック機能 */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-10px)',
                boxShadow: 6
              }
            }}
            onClick={() => executeOneClick('revenue')}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: '#4caf50' }}>
                <TrendingUpIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                売上診断
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                今すぐ売上を上げる方法を教えて
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
                endIcon={<ArrowForwardIcon />}
              >
                診断開始
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-10px)',
                boxShadow: 6
              }
            }}
            onClick={() => executeOneClick('customer')}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: '#2196f3' }}>
                <PeopleIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                顧客理解
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                お客様のことをもっと知りたい
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                sx={{ bgcolor: '#2196f3', '&:hover': { bgcolor: '#1976d2' } }}
                endIcon={<ArrowForwardIcon />}
              >
                分析開始
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-10px)',
                boxShadow: 6
              }
            }}
            onClick={() => executeOneClick('optimize')}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: '#ff9800' }}>
                <AutoFixHighIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                最適化実行
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                AIに任せて最適化する
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
                endIcon={<ArrowForwardIcon />}
              >
                最適化開始
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 処理中表示 */}
      {processing && (
        <Fade in={processing}>
          <Paper sx={{ p: 4, mb: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              AI分析中...
            </Typography>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              最適な改善案を探しています
            </Typography>
          </Paper>
        </Fade>
      )}

      {/* クイックアクション */}
      {quickActions.length > 0 && !processing && (
        <Grow in={true}>
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              おすすめアクション
            </Typography>
            <Grid container spacing={3}>
              {quickActions.map((action) => (
                <Grid item xs={12} key={action.id}>
                  <Paper 
                    sx={{ 
                      p: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: action.status === 'completed' ? 0.7 : 1
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {action.title}
                      </Typography>
                      <Chip 
                        icon={<MonetizationOnIcon />} 
                        label={action.impact} 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                    
                    {action.status === 'ready' && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => executeAction(action.id)}
                        sx={{ minWidth: 120 }}
                      >
                        実行
                      </Button>
                    )}
                    
                    {action.status === 'processing' && (
                      <Box sx={{ minWidth: 120, textAlign: 'center' }}>
                        <LinearProgress />
                        <Typography variant="caption" sx={{ mt: 1 }}>
                          実行中...
                        </Typography>
                      </Box>
                    )}
                    
                    {action.status === 'completed' && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="完了"
                        color="success"
                        sx={{ minWidth: 120 }}
                      />
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grow>
      )}

      {/* 簡易統計 */}
      <Box sx={{ mt: 6 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                156
              </Typography>
              <Typography variant="body2" color="text.secondary">
                今月の改善提案
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                92%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                実行成功率
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                3.2x
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均ROI
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                24/7
              </Typography>
              <Typography variant="body2" color="text.secondary">
                自動最適化
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  )
}

export default SimpleDashboard