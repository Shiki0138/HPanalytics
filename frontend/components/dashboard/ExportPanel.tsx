'use client'

import React, { memo, useState, useCallback } from 'react'
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  TextField,
  Divider,
  LinearProgress,
  Alert,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material'
import {
  GetApp,
  FileDownload,
  PictureAsPdf,
  TableChart,
  InsertChart,
  Settings,
  Close,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Papa from 'papaparse'
import { ExportOptions, ExportFormat, DashboardData, DateRange } from '@/types'

interface ExportPanelProps {
  data: DashboardData
  dateRange: DateRange
  onExport?: (options: ExportOptions) => Promise<void>
  disabled?: boolean
}

interface ExportJob {
  id: string
  format: ExportFormat
  status: 'preparing' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  filename?: string
}

const ExportPanel = memo(({
  data,
  dateRange,
  onExport,
  disabled = false,
}: ExportPanelProps) => {
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv')
  const [includedMetrics, setIncludedMetrics] = useState<string[]>([
    'visitors', 'pageviews', 'sessions', 'bounceRate'
  ])
  const [chartTypes, setChartTypes] = useState<string[]>([
    'timeSeries', 'topPages', 'trafficSources'
  ])
  const [customFilename, setCustomFilename] = useState('')
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])

  const isMenuOpen = Boolean(anchorEl)

  // Available export formats
  const exportFormats = [
    {
      value: 'csv' as ExportFormat,
      label: 'CSV',
      description: 'データをCSV形式でエクスポート',
      icon: <TableChart />,
      color: theme.palette.success.main,
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF',
      description: 'レポートをPDF形式でエクスポート',
      icon: <PictureAsPdf />,
      color: theme.palette.error.main,
    },
    {
      value: 'excel' as ExportFormat,
      label: 'Excel',
      description: 'データをExcel形式でエクスポート',
      icon: <InsertChart />,
      color: theme.palette.info.main,
    },
    {
      value: 'json' as ExportFormat,
      label: 'JSON',
      description: 'データをJSON形式でエクスポート',
      icon: <FileDownload />,
      color: theme.palette.warning.main,
    },
  ]

  // Available metrics
  const availableMetrics = [
    { key: 'visitors', label: '訪問者数', description: 'ユニーク訪問者数' },
    { key: 'pageviews', label: 'ページビュー', description: '総ページビュー数' },
    { key: 'sessions', label: 'セッション', description: 'セッション数' },
    { key: 'bounceRate', label: '直帰率', description: '直帰率（%）' },
    { key: 'avgSessionDuration', label: 'セッション時間', description: '平均セッション時間' },
  ]

  // Available chart types
  const availableCharts = [
    { key: 'timeSeries', label: '時系列グラフ', description: 'アクセス推移グラフ' },
    { key: 'topPages', label: '人気ページ', description: '人気ページランキング' },
    { key: 'trafficSources', label: '流入元', description: 'トラフィックソース分析' },
    { key: 'deviceStats', label: 'デバイス', description: 'デバイス別統計' },
    { key: 'geographyData', label: '地域', description: '地域別アクセス' },
  ]

  // Handle export button click
  const handleExportClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }, [])

  // Handle menu close
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  // Handle format selection from menu
  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setSelectedFormat(format)
    setDialogOpen(true)
    handleMenuClose()
  }, [handleMenuClose])

  // Generate filename
  const generateFilename = useCallback(() => {
    if (customFilename) return customFilename
    
    const dateStr = format(new Date(), 'yyyyMMdd-HHmmss', { locale: ja })
    const rangeStr = format(dateRange.startDate, 'yyyyMMdd', { locale: ja }) + 
      '-' + format(dateRange.endDate, 'yyyyMMdd', { locale: ja })
    
    return `analytics-report_${rangeStr}_${dateStr}`
  }, [customFilename, dateRange])

  // Export to CSV
  const exportToCsv = useCallback(async (options: ExportOptions) => {
    const csvData = []
    
    // Add metadata
    csvData.push(['レポート生成日時', format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })])
    csvData.push(['対象期間', `${format(dateRange.startDate, 'yyyy年MM月dd日', { locale: ja })} - ${format(dateRange.endDate, 'yyyy年MM月dd日', { locale: ja })}`])
    csvData.push([])

    // Add summary data
    if (includedMetrics.includes('visitors')) {
      csvData.push(['総訪問者数', data.summary.totalVisitors.toLocaleString()])
    }
    if (includedMetrics.includes('pageviews')) {
      csvData.push(['総ページビュー', data.summary.totalPageviews.toLocaleString()])
    }
    if (includedMetrics.includes('bounceRate')) {
      csvData.push(['直帰率', `${data.summary.bounceRate}%`])
    }
    csvData.push([])

    // Add time series data
    if (chartTypes.includes('timeSeries')) {
      csvData.push(['日付', '訪問者', 'ページビュー', 'セッション'])
      data.timeSeries.data.forEach(item => {
        csvData.push([
          format(new Date(item.date), 'yyyy/MM/dd', { locale: ja }),
          item.visitors,
          item.pageviews,
          item.sessions,
        ])
      })
      csvData.push([])
    }

    // Add top pages data
    if (chartTypes.includes('topPages')) {
      csvData.push(['人気ページ'])
      csvData.push(['ページ', '訪問者', 'ページビュー'])
      data.topPages.forEach(page => {
        csvData.push([page.path, page.visitors, page.pageviews])
      })
    }

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${options.filename}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [data, dateRange, includedMetrics, chartTypes])

  // Export to PDF
  const exportToPdf = useCallback(async (options: ExportOptions) => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    let yPosition = 20

    // Add title
    pdf.setFontSize(20)
    pdf.text('Analytics Report', 20, yPosition)
    yPosition += 15

    // Add date range
    pdf.setFontSize(12)
    pdf.text(
      `期間: ${format(dateRange.startDate, 'yyyy年MM月dd日', { locale: ja })} - ${format(dateRange.endDate, 'yyyy年MM月dd日', { locale: ja })}`,
      20,
      yPosition
    )
    yPosition += 10

    pdf.text(
      `生成日時: ${format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })}`,
      20,
      yPosition
    )
    yPosition += 20

    // Add summary data
    pdf.setFontSize(16)
    pdf.text('サマリー', 20, yPosition)
    yPosition += 10

    pdf.setFontSize(12)
    if (includedMetrics.includes('visitors')) {
      pdf.text(`総訪問者数: ${data.summary.totalVisitors.toLocaleString()}`, 20, yPosition)
      yPosition += 8
    }
    if (includedMetrics.includes('pageviews')) {
      pdf.text(`総ページビュー: ${data.summary.totalPageviews.toLocaleString()}`, 20, yPosition)
      yPosition += 8
    }
    if (includedMetrics.includes('bounceRate')) {
      pdf.text(`直帰率: ${data.summary.bounceRate}%`, 20, yPosition)
      yPosition += 8
    }

    // Capture charts if available
    if (chartTypes.length > 0) {
      const chartElements = document.querySelectorAll('[data-chart-export="true"]')
      
      for (const element of Array.from(chartElements)) {
        try {
          const canvas = await html2canvas(element as HTMLElement, {
            backgroundColor: theme.palette.background.paper,
            scale: 2,
          })
          
          const imgData = canvas.toDataURL('image/png')
          const imgWidth = 170
          const imgHeight = (canvas.height * imgWidth) / canvas.width
          
          if (yPosition + imgHeight > 270) {
            pdf.addPage()
            yPosition = 20
          }
          
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight)
          yPosition += imgHeight + 10
        } catch (error) {
          console.warn('Failed to capture chart:', error)
        }
      }
    }

    // Save PDF
    pdf.save(`${options.filename}.pdf`)
  }, [data, dateRange, includedMetrics, chartTypes, theme])

  // Handle export execution
  const handleExport = useCallback(async () => {
    const jobId = Date.now().toString()
    const exportOptions: ExportOptions = {
      format: selectedFormat,
      dateRange,
      includedMetrics,
      chartTypes,
      filename: generateFilename(),
    }

    // Create export job
    const job: ExportJob = {
      id: jobId,
      format: selectedFormat,
      status: 'preparing',
      progress: 0,
      filename: exportOptions.filename,
    }

    setExportJobs(prev => [...prev, job])
    setDialogOpen(false)

    try {
      // Update progress
      setExportJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'processing', progress: 50 } : j
      ))

      // Execute export
      if (selectedFormat === 'csv') {
        await exportToCsv(exportOptions)
      } else if (selectedFormat === 'pdf') {
        await exportToPdf(exportOptions)
      } else if (onExport) {
        await onExport(exportOptions)
      }

      // Mark as completed
      setExportJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'completed', progress: 100 } : j
      ))

      // Remove completed job after delay
      setTimeout(() => {
        setExportJobs(prev => prev.filter(j => j.id !== jobId))
      }, 3000)

    } catch (error) {
      setExportJobs(prev => prev.map(j => 
        j.id === jobId ? { 
          ...j, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
        } : j
      ))
    }
  }, [
    selectedFormat, 
    dateRange, 
    includedMetrics, 
    chartTypes, 
    generateFilename,
    exportToCsv,
    exportToPdf,
    onExport
  ])

  return (
    <>
      {/* Export Button */}
      <Tooltip title="データをエクスポート">
        <Box sx={{ position: 'relative' }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={handleExportClick}
              disabled={disabled}
              sx={{
                borderRadius: 2,
                borderColor: alpha(theme.palette.primary.main, 0.3),
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  background: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              エクスポート
            </Button>
          </motion.div>

          {/* Export Jobs Progress */}
          <AnimatePresence>
            {exportJobs.map(job => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                }}
              >
                <Box
                  sx={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    borderRadius: 2,
                    p: 1.5,
                    boxShadow: theme.shadows[4],
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {job.filename}.{job.format}
                    </Typography>
                    <Chip
                      label={job.status === 'processing' ? '処理中' : 
                             job.status === 'completed' ? '完了' :
                             job.status === 'error' ? 'エラー' : '準備中'}
                      size="small"
                      color={job.status === 'completed' ? 'success' : 
                             job.status === 'error' ? 'error' : 'primary'}
                      variant="outlined"
                    />
                  </Box>
                  
                  {job.status === 'processing' && (
                    <LinearProgress 
                      value={job.progress}
                      variant="determinate"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                  
                  {job.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {job.error}
                    </Typography>
                  )}
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </Tooltip>

      {/* Format Selection Menu */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 250,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {exportFormats.map((format, index) => (
          <motion.div
            key={format.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <MenuItem
              onClick={() => handleFormatSelect(format.value)}
              sx={{
                py: 1.5,
                px: 2,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&:hover': {
                  background: alpha(format.color, 0.08),
                },
              }}
            >
              <Box sx={{ color: format.color, mr: 1.5 }}>
                {format.icon}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {format.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format.description}
                </Typography>
              </Box>
            </MenuItem>
          </motion.div>
        ))}
      </Menu>

      {/* Export Configuration Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: theme.shadows[12],
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Settings color="primary" />
              <Typography variant="h6" fontWeight={600}>
                エクスポート設定
              </Typography>
            </Box>
            <IconButton onClick={() => setDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Format Selection */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
              エクスポート形式
            </FormLabel>
            <RadioGroup
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
            >
              {exportFormats.map(format => (
                <FormControlLabel
                  key={format.value}
                  value={format.value}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: format.color }}>
                        {format.icon}
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {format.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* Metrics Selection */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
              含める指標
            </FormLabel>
            <FormGroup>
              {availableMetrics.map(metric => (
                <FormControlLabel
                  key={metric.key}
                  control={
                    <Checkbox
                      checked={includedMetrics.includes(metric.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setIncludedMetrics(prev => [...prev, metric.key])
                        } else {
                          setIncludedMetrics(prev => prev.filter(m => m !== metric.key))
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{metric.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {metric.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* Chart Types Selection */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
              含めるグラフ・データ
            </FormLabel>
            <FormGroup>
              {availableCharts.map(chart => (
                <FormControlLabel
                  key={chart.key}
                  control={
                    <Checkbox
                      checked={chartTypes.includes(chart.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChartTypes(prev => [...prev, chart.key])
                        } else {
                          setChartTypes(prev => prev.filter(c => c !== chart.key))
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{chart.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {chart.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </FormControl>

          {/* Custom Filename */}
          <TextField
            fullWidth
            label="ファイル名（オプション）"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder={generateFilename()}
            helperText="空の場合は自動生成されます"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />

          {/* Preview */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              出力ファイル名: <strong>{customFilename || generateFilename()}.{selectedFormat}</strong>
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              期間: {format(dateRange.startDate, 'yyyy/MM/dd', { locale: ja })} - {format(dateRange.endDate, 'yyyy/MM/dd', { locale: ja })}
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>
            キャンセル
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="contained"
              onClick={handleExport}
              disabled={includedMetrics.length === 0}
              startIcon={<FileDownload />}
              sx={{
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              }}
            >
              エクスポート実行
            </Button>
          </motion.div>
        </DialogActions>
      </Dialog>
    </>
  )
})

ExportPanel.displayName = 'ExportPanel'

export default ExportPanel