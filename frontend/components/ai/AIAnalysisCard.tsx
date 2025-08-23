'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  useTheme,
  alpha,
} from '@mui/material'
import {
  Psychology,
  TrendingUp,
  Warning,
  BugReport,
  Group,
  Speed,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '@/components/common/Card'

interface AIAnalysisResult {
  anomalies?: {
    total_anomalies: number
    severity_breakdown: Record<string, number>
    anomalies: Array<{
      metric_name: string
      severity: string
      description: string
      confidence: number
    }>
  }
  trends?: {
    trends: Record<string, any>
    predictions: Record<string, any>
    growth_opportunities: Array<{
      type: string
      metric: string
      description: string
      potential_impact: string
    }>
  }
  behavior?: {
    behavior_patterns: Record<string, any>
    optimization_suggestions: Array<{
      category: string
      title: string
      description: string
      expected_impact: string
    }>
  }
  comprehensive?: {
    analysis_results: Record<string, any>
    ai_insights: Record<string, any>
    recommendations: Array<string>
    roi_predictions: Record<string, number>
  }
}

interface AIAnalysisCardProps {
  siteId: string
  dateRange?: {
    startDate: Date
    endDate: Date
  }
}

const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  siteId,
  dateRange,
}) => {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AIAnalysisResult>({})
  const [error, setError] = useState<string | null>(null)

  // 分析実行
  const runAnalysis = async (analysisType: string) => {
    try {
      setLoading(true)
      setError(null)

      let endpoint = ''
      let method = 'GET'
      let body = null

      switch (analysisType) {
        case 'comprehensive':
          endpoint = `/api/v1/analytics/ai/comprehensive/${siteId}`
          method = 'POST'
          body = JSON.stringify({
            date_range: dateRange ? {
              start: dateRange.startDate.toISOString(),
              end: dateRange.endDate.toISOString()
            } : undefined
          })
          break
        case 'anomalies':
          endpoint = `/api/v1/analytics/ai/anomalies/${siteId}`
          break
        case 'trends':
          endpoint = `/api/v1/analytics/ai/trends/${siteId}?period=30d`
          break
        case 'behavior':
          endpoint = `/api/v1/analytics/ai/behavior/${siteId}`
          break
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })

      if (!response.ok) {
        throw new Error(`分析エラー: ${response.statusText}`)
      }

      const data = await response.json()
      setResults(prev => ({ ...prev, [analysisType]: data }))
    } catch (err) {
      console.error('AI analysis error:', err)
      setError(err instanceof Error ? err.message : '分析中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // 包括的分析実行
  const runComprehensiveAnalysis = () => runAnalysis('comprehensive')

  // タブ変更ハンドラー
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  // 分析タイプの設定
  const analysisTypes = [
    {
      id: 'comprehensive',
      label: '包括的分析',
      icon: <Psychology />,
      description: 'AI による全面的な分析とインサイト生成',
      color: theme.palette.primary.main,
    },
    {
      id: 'anomalies',
      label: '異常検知',
      icon: <Warning />,
      description: 'データの異常値とパターン外れを検出',
      color: theme.palette.warning.main,
    },
    {
      id: 'trends',
      label: 'トレンド分析',
      icon: <TrendingUp />,
      description: 'トレンド分析と将来予測',
      color: theme.palette.success.main,
    },
    {
      id: 'behavior',
      label: 'ユーザー行動',
      icon: <Group />,
      description: 'ユーザー行動パターンと最適化提案',
      color: theme.palette.info.main,
    },
  ]

  // 結果表示コンポーネント
  const renderResults = (analysisType: string) => {
    const result = results[analysisType as keyof AIAnalysisResult]
    if (!result) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ mt: 2 }}>
          {analysisType === 'anomalies' && result.total_anomalies > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {result.total_anomalies}件の異常値が検出されました
            </Alert>
          )}

          {analysisType === 'comprehensive' && result.recommendations && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                主要な推奨事項
              </Typography>
              {result.recommendations.map((rec: string, i: number) => (
                <Typography key={i} variant="body2" sx={{ mb: 1 }}>
                  • {rec}
                </Typography>
              ))}
            </Box>
          )}

          {analysisType === 'trends' && result.growth_opportunities && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                成長機会
              </Typography>
              {result.growth_opportunities.map((opp: any, i: number) => (
                <Box key={i} sx={{ mb: 1, p: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 1 }}>
                  <Typography variant="subtitle2">{opp.metric}</Typography>
                  <Typography variant="body2" color="text.secondary">{opp.description}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {analysisType === 'behavior' && result.optimization_suggestions && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                最適化提案
              </Typography>
              {result.optimization_suggestions.map((suggestion: any, i: number) => (
                <Box key={i} sx={{ mb: 1, p: 1, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                  <Typography variant="subtitle2">{suggestion.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{suggestion.description}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </motion.div>
    )
  }

  return (
    <Card
      title="AI分析エンジン"
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
      }}
    >
      <Box sx={{ p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 包括的分析ボタン */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={runComprehensiveAnalysis}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Psychology />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              },
            }}
          >
            {loading ? 'AI分析中...' : 'AI包括分析を実行'}
          </Button>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            Google Analytics Intelligence、Adobe Senseiを超える次世代AI分析
          </Typography>
        </Box>

        {/* 分析タイプタブ */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {analysisTypes.map((type, index) => (
            <Tab
              key={type.id}
              label={
                <Badge
                  badgeContent={results[type.id as keyof AIAnalysisResult] ? '✓' : 0}
                  color="success"
                  invisible={!results[type.id as keyof AIAnalysisResult]}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {type.icon}
                    <Typography variant="caption">{type.label}</Typography>
                  </Box>
                </Badge>
              }
              sx={{
                minWidth: 'auto',
                px: 2,
              }}
            />
          ))}
        </Tabs>

        {/* 個別分析セクション */}
        <AnimatePresence mode="wait">
          {analysisTypes.map((type, index) => (
            activeTab === index && (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  sx={{
                    p: 2,
                    border: `1px solid ${alpha(type.color, 0.2)}`,
                    borderRadius: 2,
                    background: alpha(type.color, 0.02),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        background: alpha(type.color, 0.1),
                        color: type.color,
                        mr: 2,
                      }}
                    >
                      {type.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{type.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={() => runAnalysis(type.id)}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={16} /> : <Speed />}
                      sx={{
                        borderColor: type.color,
                        color: type.color,
                        '&:hover': {
                          backgroundColor: alpha(type.color, 0.1),
                          borderColor: type.color,
                        },
                      }}
                    >
                      {loading ? '分析中' : '実行'}
                    </Button>
                  </Box>

                  {renderResults(type.id)}
                </Box>
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {/* 結果サマリー */}
        {Object.keys(results).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Box
              sx={{
                mt: 3,
                p: 2,
                background: alpha(theme.palette.success.main, 0.05),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Typography variant="h6" color="success.main" gutterBottom>
                分析完了サマリー
              </Typography>
              <Typography variant="body2">
                {Object.keys(results).length}種類の分析が完了しました。
                上記タブから詳細結果をご確認ください。
              </Typography>
            </Box>
          </motion.div>
        )}
      </Box>
    </Card>
  )
}

export default AIAnalysisCard