'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Badge,
  useTheme,
  alpha,
} from '@mui/material'
import {
  ExpandMore,
  Psychology,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  AutoAwesome,
  Analytics,
  Insights,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '@/components/common/Card'

interface AIInsight {
  id: string
  category: string
  title: string
  description: string
  impact_score: number
  confidence: number
  recommendations: string[]
  expected_roi?: number
  implementation_difficulty: string
  source_category: string
}

interface AIInsightsPanelProps {
  siteId: string
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  autoRefresh?: boolean
  refreshInterval?: number
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  siteId,
  dateRange,
  autoRefresh = false,
  refreshInterval = 60000, // 1分
}) => {
  const theme = useTheme()
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false)

  // AIインサイト取得
  const fetchAIInsights = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (dateRange) {
        params.append('startDate', dateRange.startDate.toISOString())
        params.append('endDate', dateRange.endDate.toISOString())
      }

      const response = await fetch(
        `/api/v1/analytics/insights/${siteId}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`分析取得エラー: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.insights) {
        setInsights(data.insights)
        setLastUpdated(new Date())
      } else {
        setError('インサイトデータの取得に失敗しました')
      }
    } catch (err) {
      console.error('AI insights fetch error:', err)
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込みとリフレッシュ
  useEffect(() => {
    fetchAIInsights()
  }, [siteId, dateRange])

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchAIInsights, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, siteId, dateRange])

  // アコーディオン展開ハンドラー
  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedPanel(isExpanded ? panel : false)
  }

  // インパクトスコアの色計算
  const getImpactColor = (score: number): string => {
    if (score >= 8) return theme.palette.error.main
    if (score >= 6) return theme.palette.warning.main
    if (score >= 4) return theme.palette.info.main
    return theme.palette.success.main
  }

  // 信頼度の色計算
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return theme.palette.success.main
    if (confidence >= 0.6) return theme.palette.warning.main
    return theme.palette.error.main
  }

  // カテゴリアイコン取得
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'performance':
        return <TrendingUp />
      case 'conversion':
        return <Analytics />
      case 'user_experience':
        return <Psychology />
      case 'content':
        return <Insights />
      default:
        return <AutoAwesome />
    }
  }

  // 実装難易度のチップ色
  const getDifficultyColor = (difficulty: string): 'success' | 'warning' | 'error' => {
    switch (difficulty.toLowerCase()) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
        return 'error'
      default:
        return 'warning'
    }
  }

  const insightVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  return (
    <Card
      title="AI分析インサイト"
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
      }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              最終更新: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Tooltip title="更新">
            <IconButton
              onClick={fetchAIInsights}
              disabled={loading}
              size="small"
              sx={{
                background: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  background: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <Refresh />
                </motion.div>
              )}
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Box sx={{ p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && insights.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              AIが分析中...
            </Typography>
          </Box>
        )}

        <AnimatePresence>
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              variants={insightVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ delay: index * 0.1 }}
            >
              <Accordion
                expanded={expandedPanel === insight.id}
                onChange={handleAccordionChange(insight.id)}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: theme.shadows[2],
                  '&:before': { display: 'none' },
                  background: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(8px)',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        background: alpha(getImpactColor(insight.impact_score), 0.1),
                        color: getImpactColor(insight.impact_score),
                      }}
                    >
                      {getCategoryIcon(insight.category)}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {insight.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={insight.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={`実装: ${insight.implementation_difficulty}`}
                          size="small"
                          color={getDifficultyColor(insight.implementation_difficulty)}
                          variant="outlined"
                        />
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                      <Typography variant="h6" fontWeight={700}>
                        {insight.impact_score.toFixed(1)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        インパクト
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  <Box sx={{ pt: 1 }}>
                    {/* 説明 */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {insight.description}
                    </Typography>

                    {/* 信頼度バー */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          信頼度
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: getConfidenceColor(insight.confidence) }}
                        >
                          {(insight.confidence * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={insight.confidence * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.grey[500], 0.2),
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getConfidenceColor(insight.confidence),
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>

                    {/* 推奨事項 */}
                    {insight.recommendations.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" fontWeight={600} gutterBottom>
                          推奨アクション
                        </Typography>
                        {insight.recommendations.map((rec, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                            <CheckCircle
                              sx={{
                                fontSize: 16,
                                color: theme.palette.success.main,
                                mt: 0.25,
                                mr: 1,
                              }}
                            />
                            <Typography variant="body2">{rec}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* ROI予測 */}
                    {insight.expected_roi && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: alpha(theme.palette.success.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          期待ROI: {insight.expected_roi}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          ))}
        </AnimatePresence>

        {insights.length === 0 && !loading && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Psychology sx={{ fontSize: 60, color: theme.palette.text.secondary, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              インサイトがありません
            </Typography>
            <Typography variant="body2" color="text.secondary">
              データが蓄積されるとAIが自動で分析します
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  )
}

export default AIInsightsPanel