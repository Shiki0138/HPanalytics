'use client'

import React, { memo, useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts'
import { Box, useTheme, alpha } from '@mui/material'
import { format, parseISO } from 'date-fns'
import { ChartDataPoint } from '@/types'
import { motion } from 'framer-motion'

interface TimeSeriesChartProps {
  data: ChartDataPoint[]
  metrics: string[]
  height?: number
  showArea?: boolean
  showGrid?: boolean
  showDots?: boolean
  enableZoom?: boolean
  compareMode?: boolean
}

const TimeSeriesChart = memo(({
  data,
  metrics,
  height = 400,
  showArea = false,
  showGrid = true,
  showDots = false,
  enableZoom = true,
  compareMode = false,
}: TimeSeriesChartProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Memoized chart data processing
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedDate: format(parseISO(item.date), 'MM/dd'),
      fullDate: format(parseISO(item.date), 'yyyy年MM月dd日'),
    }))
  }, [data])

  // Color palette for different metrics
  const colors = useMemo(() => ({
    visitors: theme.palette.primary.main,
    pageviews: theme.palette.success.main,
    sessions: theme.palette.info.main,
    bounceRate: theme.palette.warning.main,
    avgSessionDuration: theme.palette.secondary.main,
  }), [theme])

  // Custom tooltip component
  const CustomTooltip = memo(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Box
          sx={{
            background: alpha(isDark ? '#1a1a1a' : '#ffffff', 0.95),
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: 2,
            p: 2,
            backdropFilter: 'blur(20px)',
            boxShadow: theme.shadows[8],
          }}
        >
          <Box sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
            {processedData.find(d => d.formattedDate === label)?.fullDate}
          </Box>
          {payload.map((entry: any, index: number) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.5,
                fontSize: '0.875rem',
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: entry.color,
                }}
              />
              <Box sx={{ color: theme.palette.text.secondary }}>
                {entry.name}:
              </Box>
              <Box sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {entry.name.includes('Rate') 
                  ? `${entry.value}%`
                  : entry.value.toLocaleString()
                }
              </Box>
            </Box>
          ))}
        </Box>
      </motion.div>
    )
  })

  CustomTooltip.displayName = 'CustomTooltip'

  // Custom dot component
  const CustomDot = memo(({ cx, cy, payload, dataKey }: any) => {
    if (!showDots) return null
    
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={4}
        fill={colors[dataKey as keyof typeof colors]}
        stroke={theme.palette.background.paper}
        strokeWidth={2}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.5 }}
      />
    )
  })

  CustomDot.displayName = 'CustomDot'

  const ChartComponent = showArea ? AreaChart : LineChart

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={processedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            {showArea && metrics.map((metric) => (
              <linearGradient
                key={`gradient-${metric}`}
                id={`gradient-${metric}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={colors[metric as keyof typeof colors]}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={colors[metric as keyof typeof colors]}
                  stopOpacity={0.05}
                />
              </linearGradient>
            ))}
          </defs>
          
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={alpha(theme.palette.divider, 0.3)}
              vertical={false}
            />
          )}
          
          <XAxis
            dataKey="formattedDate"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 12,
              fontWeight: 500,
            }}
            dy={10}
          />
          
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 12,
              fontWeight: 500,
            }}
            dx={-10}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
              return value.toString()
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {metrics.map((metric) => {
            const color = colors[metric as keyof typeof colors]
            
            if (showArea) {
              return (
                <Area
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={color}
                  strokeWidth={3}
                  fill={`url(#gradient-${metric})`}
                  dot={<CustomDot dataKey={metric} />}
                  activeDot={{
                    r: 6,
                    fill: color,
                    stroke: theme.palette.background.paper,
                    strokeWidth: 2,
                  }}
                />
              )
            }

            return (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={color}
                strokeWidth={3}
                dot={<CustomDot dataKey={metric} />}
                activeDot={{
                  r: 6,
                  fill: color,
                  stroke: theme.palette.background.paper,
                  strokeWidth: 2,
                }}
              />
            )
          })}
          
          {/* Average reference line */}
          {compareMode && metrics.length === 1 && (
            <ReferenceLine
              y={processedData.reduce((sum, item) => sum + item[metrics[0] as keyof ChartDataPoint] as number, 0) / processedData.length}
              stroke={alpha(colors[metrics[0] as keyof typeof colors], 0.5)}
              strokeDasharray="5 5"
              label={{
                value: "平均",
                position: "topRight",
                fill: theme.palette.text.secondary,
              }}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </motion.div>
  )
})

TimeSeriesChart.displayName = 'TimeSeriesChart'

export default TimeSeriesChart