'use client'

import React, { memo, useMemo, useState } from 'react'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Box, Typography, useTheme, alpha } from '@mui/material'
import { motion } from 'framer-motion'

interface BarChartData {
  name: string
  value: number
  change?: number
  previousValue?: number
  category?: string
  icon?: React.ReactNode
}

interface BarChartProps {
  data: BarChartData[]
  height?: number
  orientation?: 'vertical' | 'horizontal'
  showGrid?: boolean
  showValues?: boolean
  showComparison?: boolean
  colorScheme?: 'default' | 'gradient' | 'categorical'
  animate?: boolean
  interactive?: boolean
  maxBars?: number
  sortBy?: 'value' | 'name' | 'change'
  sortOrder?: 'asc' | 'desc'
}

const BarChart = memo(({
  data,
  height = 400,
  orientation = 'vertical',
  showGrid = true,
  showValues = true,
  showComparison = false,
  colorScheme = 'default',
  animate = true,
  interactive = true,
  maxBars = 10,
  sortBy = 'value',
  sortOrder = 'desc',
}: BarChartProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Color schemes
  const colors = useMemo(() => {
    switch (colorScheme) {
      case 'gradient':
        return {
          primary: theme.palette.primary.main,
          gradient: `url(#barGradient)`,
        }
      case 'categorical':
        return {
          colors: [
            theme.palette.primary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.error.main,
            theme.palette.info.main,
            theme.palette.secondary.main,
          ]
        }
      default:
        return {
          primary: theme.palette.primary.main,
          secondary: theme.palette.primary.light,
        }
    }
  }, [theme, colorScheme])

  // Process and sort data
  const processedData = useMemo(() => {
    let sortedData = [...data]
    
    // Sort data
    sortedData.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'change':
          aValue = a.change || 0
          bValue = b.change || 0
          break
        default:
          aValue = a.value
          bValue = b.value
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Limit number of bars
    return sortedData.slice(0, maxBars).map((item, index) => ({
      ...item,
      color: colorScheme === 'categorical' && colors.colors 
        ? colors.colors[index % colors.colors.length]
        : colors.primary,
      index,
    }))
  }, [data, sortBy, sortOrder, maxBars, colors, colorScheme])

  // Calculate max value for reference line
  const maxValue = useMemo(() => {
    return Math.max(...processedData.map(item => item.value))
  }, [processedData])

  // Custom tooltip
  const CustomTooltip = memo(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    
    const data = payload[0].payload

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
            minWidth: 180,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {data.name}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: data.color,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              値:
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {data.value.toLocaleString()}
            </Typography>
          </Box>

          {showComparison && data.change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                変化:
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight={600}
                color={data.change > 0 ? 'success.main' : data.change < 0 ? 'error.main' : 'text.primary'}
              >
                {data.change > 0 ? '+' : ''}{data.change}%
              </Typography>
            </Box>
          )}

          {data.previousValue !== undefined && (
            <Typography variant="caption" color="text.secondary">
              前回: {data.previousValue.toLocaleString()}
            </Typography>
          )}
        </Box>
      </motion.div>
    )
  })

  CustomTooltip.displayName = 'CustomTooltip'

  // Custom bar shape for animations
  const CustomBar = memo((props: any) => {
    const { fill, payload, ...rest } = props
    const isHovered = hoveredIndex === payload.index

    return (
      <motion.rect
        {...rest}
        fill={fill}
        initial={animate ? { 
          [orientation === 'vertical' ? 'height' : 'width']: 0,
          [orientation === 'vertical' ? 'y' : 'x']: 
            orientation === 'vertical' ? rest.y + rest.height : rest.x
        } : {}}
        animate={{ 
          [orientation === 'vertical' ? 'height' : 'width']: 
            orientation === 'vertical' ? rest.height : rest.width,
          [orientation === 'vertical' ? 'y' : 'x']: 
            orientation === 'vertical' ? rest.y : rest.x,
          filter: isHovered ? 'brightness(1.1) saturate(1.2)' : 'none',
        }}
        transition={{ 
          duration: animate ? 0.8 : 0,
          delay: animate ? payload.index * 0.1 : 0,
          ease: 'easeOut',
        }}
        style={{
          cursor: interactive ? 'pointer' : 'default',
        }}
        onMouseEnter={() => interactive && setHoveredIndex(payload.index)}
        onMouseLeave={() => interactive && setHoveredIndex(null)}
      />
    )
  })

  CustomBar.displayName = 'CustomBar'

  // Value label component
  const CustomLabel = memo(({ x, y, width, height, value }: any) => {
    if (!showValues) return null

    const labelX = orientation === 'vertical' ? x + width / 2 : x + width + 5
    const labelY = orientation === 'vertical' ? y - 5 : y + height / 2

    return (
      <text
        x={labelX}
        y={labelY}
        fill={theme.palette.text.secondary}
        textAnchor={orientation === 'vertical' ? 'middle' : 'start'}
        dominantBaseline={orientation === 'vertical' ? 'baseline' : 'central'}
        fontSize={12}
        fontWeight={500}
      >
        {value.toLocaleString()}
      </text>
    )
  })

  CustomLabel.displayName = 'CustomLabel'

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={processedData}
          layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
              <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
            </linearGradient>
          </defs>

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={alpha(theme.palette.divider, 0.3)}
              horizontal={orientation === 'vertical'}
              vertical={orientation === 'horizontal'}
            />
          )}

          <XAxis
            type={orientation === 'vertical' ? 'category' : 'number'}
            dataKey={orientation === 'vertical' ? 'name' : undefined}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 12,
              fontWeight: 500,
            }}
            angle={orientation === 'vertical' ? -45 : 0}
            textAnchor={orientation === 'vertical' ? 'end' : 'middle'}
            height={orientation === 'vertical' ? 80 : undefined}
            tickFormatter={orientation === 'horizontal' ? (value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
              return value.toString()
            } : undefined}
          />

          <YAxis
            type={orientation === 'vertical' ? 'number' : 'category'}
            dataKey={orientation === 'horizontal' ? 'name' : undefined}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 12,
              fontWeight: 500,
            }}
            width={orientation === 'horizontal' ? 100 : undefined}
            tickFormatter={orientation === 'vertical' ? (value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
              return value.toString()
            } : undefined}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Average reference line */}
          {showComparison && (
            <ReferenceLine
              {...(orientation === 'vertical' ? { y: maxValue * 0.7 } : { x: maxValue * 0.7 })}
              stroke={alpha(theme.palette.warning.main, 0.5)}
              strokeDasharray="5 5"
              label={{
                value: "目標",
                position: orientation === 'vertical' ? 'topRight' : 'topLeft',
                fill: theme.palette.text.secondary,
              }}
            />
          )}

          <Bar
            dataKey="value"
            radius={orientation === 'vertical' ? [4, 4, 0, 0] : [0, 4, 4, 0]}
            shape={<CustomBar />}
            label={<CustomLabel />}
          >
            {colorScheme === 'categorical' 
              ? processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))
              : colorScheme === 'gradient'
              ? processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                ))
              : processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors.primary} />
                ))
            }
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

BarChart.displayName = 'BarChart'

export default BarChart