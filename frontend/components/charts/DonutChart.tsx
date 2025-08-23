'use client'

import React, { memo, useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Box, Typography, useTheme, alpha } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'

interface DonutChartData {
  name: string
  value: number
  percentage?: number
  color?: string
  icon?: React.ReactNode
}

interface DonutChartProps {
  data: DonutChartData[]
  innerRadius?: number
  outerRadius?: number
  height?: number
  showLabels?: boolean
  showLegend?: boolean
  showCenter?: boolean
  centerMetric?: string
  centerValue?: string | number
  animate?: boolean
  interactive?: boolean
  colorScheme?: 'default' | 'vibrant' | 'pastel' | 'monochrome'
}

const DonutChart = memo(({
  data,
  innerRadius = 60,
  outerRadius = 100,
  height = 300,
  showLabels = true,
  showLegend = true,
  showCenter = true,
  centerMetric = 'Total',
  centerValue,
  animate = true,
  interactive = true,
  colorScheme = 'default',
}: DonutChartProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Color schemes
  const colorSchemes = useMemo(() => ({
    default: [
      theme.palette.primary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main,
      theme.palette.secondary.main,
    ],
    vibrant: [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ],
    pastel: [
      '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA',
      '#FFD1DC', '#E0BBE4', '#D4F1F4', '#FCF5C7'
    ],
    monochrome: [
      '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6',
      '#BDC3C7', '#D5DBDB', '#EBF0F0', '#F8F9FA'
    ]
  }), [theme])

  // Process data with colors and percentages
  const processedData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    const colors = colorSchemes[colorScheme]
    
    return data.map((item, index) => ({
      ...item,
      color: item.color || colors[index % colors.length],
      percentage: item.percentage || Math.round((item.value / total) * 100),
    }))
  }, [data, colorScheme, colorSchemes])

  // Calculate total for center display
  const totalValue = useMemo(() => {
    return centerValue || processedData.reduce((sum, item) => sum + item.value, 0)
  }, [centerValue, processedData])

  // Custom tooltip
  const CustomTooltip = memo(({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    
    const data = payload[0].payload

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
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
            minWidth: 150,
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 1 
          }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: data.color,
              }}
            />
            <Typography variant="subtitle2" fontWeight={600}>
              {data.name}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            値: {data.value.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            割合: {data.percentage}%
          </Typography>
        </Box>
      </motion.div>
    )
  })

  CustomTooltip.displayName = 'CustomTooltip'

  // Custom legend
  const CustomLegend = memo((props: any) => {
    if (!showLegend) return null

    return (
      <Box sx={{ mt: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 1.5,
            maxHeight: 120,
            overflow: 'auto',
          }}
        >
          {processedData.map((entry, index) => (
            <motion.div
              key={entry.name}
              initial={animate ? { opacity: 0, x: -10 } : {}}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={interactive ? { scale: 1.05 } : {}}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  borderRadius: 1,
                  cursor: interactive ? 'pointer' : 'default',
                  backgroundColor: hoveredIndex === index 
                    ? alpha(entry.color, 0.1) 
                    : 'transparent',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={() => interactive && setHoveredIndex(index)}
                onMouseLeave={() => interactive && setHoveredIndex(null)}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: entry.color,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    {entry.name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    {entry.percentage}%
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          ))}
        </Box>
      </Box>
    )
  })

  CustomLegend.displayName = 'CustomLegend'

  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.9 } : {}}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={animate ? 1000 : 0}
            onMouseEnter={(_, index) => interactive && setHoveredIndex(index)}
            onMouseLeave={() => interactive && setHoveredIndex(null)}
          >
            {processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={theme.palette.background.paper}
                strokeWidth={2}
                style={{
                  filter: hoveredIndex === index 
                    ? 'brightness(1.1) saturate(1.2)' 
                    : 'none',
                  cursor: interactive ? 'pointer' : 'default',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          
          {/* Center content */}
          {showCenter && (
            <g>
              <circle
                cx="50%"
                cy="50%"
                r={innerRadius - 10}
                fill="transparent"
                pointerEvents="none"
              />
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fill: theme.palette.text.secondary,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {centerMetric}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fill: theme.palette.text.primary,
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              >
                {typeof totalValue === 'number' 
                  ? totalValue.toLocaleString()
                  : totalValue
                }
              </text>
            </g>
          )}
        </PieChart>
      </ResponsiveContainer>
      
      <AnimatePresence>
        <CustomLegend />
      </AnimatePresence>
    </motion.div>
  )
})

DonutChart.displayName = 'DonutChart'

export default DonutChart