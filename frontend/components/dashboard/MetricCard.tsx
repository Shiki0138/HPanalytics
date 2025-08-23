'use client'

import React, { memo, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  MoreVert,
  InfoOutlined,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { MetricCard as MetricCardType } from '@/types'

interface MetricCardProps {
  metric: MetricCardType
  loading?: boolean
  onClick?: () => void
  onMenuClick?: () => void
  showTrend?: boolean
  showSparkline?: boolean
  size?: 'small' | 'medium' | 'large'
  animate?: boolean
  sparklineData?: number[]
}

const MetricCard = memo(({
  metric,
  loading = false,
  onClick,
  onMenuClick,
  showTrend = true,
  showSparkline = false,
  size = 'medium',
  animate = true,
  sparklineData = [],
}: MetricCardProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Format value based on metric format
  const formattedValue = useMemo(() => {
    if (loading) return '---'
    
    const { value, format } = metric
    
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'currency':
        return new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: 'JPY',
        }).format(value)
      case 'duration':
        if (value < 60) return `${Math.round(value)}秒`
        if (value < 3600) return `${Math.round(value / 60)}分`
        return `${Math.round(value / 3600)}時間`
      default:
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
        return value.toLocaleString()
    }
  }, [metric, loading])

  // Calculate change percentage and trend
  const { changePercentage, trendIcon, trendColor } = useMemo(() => {
    if (loading || !metric.previousValue) {
      return {
        changePercentage: 0,
        trendIcon: TrendingFlat,
        trendColor: theme.palette.text.disabled,
      }
    }

    const change = metric.change
    const changePercentage = Math.abs(change)
    
    let trendIcon, trendColor

    if (change > 0) {
      trendIcon = TrendingUp
      trendColor = theme.palette.success.main
    } else if (change < 0) {
      trendIcon = TrendingDown
      trendColor = theme.palette.error.main
    } else {
      trendIcon = TrendingFlat
      trendColor = theme.palette.text.secondary
    }

    return { changePercentage, trendIcon, trendColor }
  }, [metric, loading, theme])

  // Card dimensions based on size
  const dimensions = useMemo(() => {
    switch (size) {
      case 'small':
        return { minHeight: 120, padding: 2 }
      case 'large':
        return { minHeight: 200, padding: 3 }
      default:
        return { minHeight: 160, padding: 2.5 }
    }
  }, [size])

  // Sparkline mini chart (simplified version)
  const SparklineChart = memo(() => {
    if (!showSparkline || !sparklineData.length) return null

    const max = Math.max(...sparklineData)
    const min = Math.min(...sparklineData)
    const range = max - min || 1

    const points = sparklineData.map((value, index) => {
      const x = (index / (sparklineData.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    }).join(' ')

    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: 60,
          height: 24,
          opacity: 0.7,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            fill="none"
            stroke={metric.color}
            strokeWidth="2"
            points={points}
          />
        </svg>
      </Box>
    )
  })

  SparklineChart.displayName = 'SparklineChart'

  if (loading) {
    return (
      <Card
        sx={{
          minHeight: dimensions.minHeight,
          position: 'relative',
          background: theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ p: dimensions.padding }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Skeleton variant="circular" width={48} height={48} />
            <Box sx={{ ml: 'auto' }}>
              <Skeleton variant="circular" width={24} height={24} />
            </Box>
          </Box>
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="100%" height={48} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20, scale: 0.95 } : {}}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        ease: 'easeOut',
        delay: animate ? Math.random() * 0.2 : 0,
      }}
      whileHover={animate ? { 
        y: -4,
        transition: { duration: 0.2 }
      } : {}}
    >
      <Card
        onClick={onClick}
        sx={{
          minHeight: dimensions.minHeight,
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
          background: isDark
            ? `linear-gradient(135deg, ${alpha(metric.color, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 40%)`
            : `linear-gradient(135deg, ${alpha(metric.color, 0.02)} 0%, ${theme.palette.background.paper} 40%)`,
          border: `1px solid ${alpha(metric.color, 0.1)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': onClick ? {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 40px ${alpha(metric.color, 0.12)}`,
            border: `1px solid ${alpha(metric.color, 0.2)}`,
          } : {},
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${metric.color} 0%, ${alpha(metric.color, 0.6)} 100%)`,
            borderRadius: '12px 12px 0 0',
          },
        }}
      >
        <CardContent sx={{ p: dimensions.padding, position: 'relative' }}>
          {/* Header with Icon and Menu */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size === 'small' ? 40 : 48,
                height: size === 'small' ? 40 : 48,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(metric.color, 0.15)} 0%, ${alpha(metric.color, 0.05)} 100%)`,
                color: metric.color,
                fontSize: size === 'small' ? 20 : 24,
              }}
            >
              <Typography variant="h4" component="span">
                {metric.icon}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="詳細情報">
                <IconButton size="small" sx={{ opacity: 0.6 }}>
                  <InfoOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              {onMenuClick && (
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation()
                    onMenuClick()
                  }}
                  sx={{ opacity: 0.6 }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant={size === 'small' ? 'caption' : 'body2'}
            color="text.secondary"
            gutterBottom
            sx={{
              fontWeight: 500,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {metric.title}
          </Typography>

          {/* Value */}
          <Typography
            variant={size === 'small' ? 'h5' : size === 'large' ? 'h3' : 'h4'}
            component="div"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1,
              lineHeight: 1.2,
            }}
          >
            {formattedValue}
          </Typography>

          {/* Trend Indicator */}
          {showTrend && metric.previousValue && (
            <motion.div
              initial={animate ? { opacity: 0, x: -10 } : {}}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: trendColor,
                }}
              >
                <Box component={trendIcon} sx={{ fontSize: 16 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontSize: size === 'small' ? '0.7rem' : '0.75rem',
                  }}
                >
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}% 
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ 
                      ml: 0.5, 
                      color: theme.palette.text.secondary,
                      fontSize: '0.7rem',
                    }}
                  >
                    vs 前回
                  </Typography>
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Sparkline Chart */}
          <SparklineChart />

          {/* Pulse Animation for Real-time Updates */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: theme.palette.success.main,
            }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [1, 0.3, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: theme.palette.success.main,
              }}
            />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

MetricCard.displayName = 'MetricCard'

export default MetricCard