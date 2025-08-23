'use client'

import React, { memo, useState, useCallback, useMemo } from 'react'
import {
  Box,
  ButtonGroup,
  Button,
  Popover,
  Paper,
  Typography,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Chip,
} from '@mui/material'
import {
  CalendarToday,
  ChevronLeft,
  ChevronRight,
  Today,
  DateRange as DateRangeIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  format,
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isWithinInterval,
  getDaysInMonth,
  startOfYear,
  addMonths,
  subMonths as subMonthsDate,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { DateRange, DateRangePreset } from '@/types'

interface DateRangePickerProps {
  value: DateRange
  onChange: (dateRange: DateRange) => void
  maxDate?: Date
  minDate?: Date
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

const presetOptions: Array<{
  key: DateRangePreset
  label: string
  getValue: () => { startDate: Date; endDate: Date }
}> = [
  {
    key: 'today',
    label: '今日',
    getValue: () => ({
      startDate: startOfDay(new Date()),
      endDate: endOfDay(new Date()),
    }),
  },
  {
    key: 'yesterday',
    label: '昨日',
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      }
    },
  },
  {
    key: '7days',
    label: '過去7日',
    getValue: () => ({
      startDate: startOfDay(subDays(new Date(), 6)),
      endDate: endOfDay(new Date()),
    }),
  },
  {
    key: '30days',
    label: '過去30日',
    getValue: () => ({
      startDate: startOfDay(subDays(new Date(), 29)),
      endDate: endOfDay(new Date()),
    }),
  },
  {
    key: '90days',
    label: '過去90日',
    getValue: () => ({
      startDate: startOfDay(subDays(new Date(), 89)),
      endDate: endOfDay(new Date()),
    }),
  },
  {
    key: 'custom',
    label: 'カスタム',
    getValue: () => ({
      startDate: startOfDay(subDays(new Date(), 7)),
      endDate: endOfDay(new Date()),
    }),
  },
]

const DateRangePicker = memo(({
  value,
  onChange,
  maxDate = new Date(),
  minDate = subMonths(new Date(), 12),
  disabled = false,
  size = 'medium',
}: DateRangePickerProps) => {
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [viewDate, setViewDate] = useState(new Date())
  const [selectingStart, setSelectingStart] = useState(true)
  const [tempRange, setTempRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  })

  const isOpen = Boolean(anchorEl)

  // Handle preset selection
  const handlePresetClick = useCallback((preset: DateRangePreset) => {
    if (preset === 'custom') {
      setAnchorEl(document.getElementById('date-range-button'))
      return
    }

    const presetOption = presetOptions.find(option => option.key === preset)
    if (presetOption) {
      const range = presetOption.getValue()
      onChange({
        ...range,
        preset,
      })
    }
  }, [onChange])

  // Handle calendar date click
  const handleDateClick = useCallback((date: Date) => {
    if (selectingStart || !tempRange.startDate) {
      setTempRange({ startDate: date, endDate: null })
      setSelectingStart(false)
    } else {
      const startDate = tempRange.startDate
      const endDate = date
      
      if (startDate && endDate) {
        const finalRange = startDate > endDate 
          ? { startDate: endDate, endDate: startDate }
          : { startDate, endDate }
        
        onChange({
          ...finalRange,
          preset: 'custom',
        })
        
        setTempRange({ startDate: null, endDate: null })
        setSelectingStart(true)
        setAnchorEl(null)
      }
    }
  }, [selectingStart, tempRange.startDate, onChange])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = startOfWeek(firstDay, { weekStartsOn: 1 })
    const endDay = endOfWeek(lastDay, { weekStartsOn: 1 })
    
    const days = []
    let currentDay = startDay
    
    while (currentDay <= endDay) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }
    
    return days
  }, [viewDate])

  // Check if date is selected
  const isDateSelected = useCallback((date: Date) => {
    if (tempRange.startDate && tempRange.endDate) {
      return isWithinInterval(date, { start: tempRange.startDate, end: tempRange.endDate })
    }
    if (tempRange.startDate) {
      return isSameDay(date, tempRange.startDate)
    }
    if (value.startDate && value.endDate) {
      return isWithinInterval(date, { start: value.startDate, end: value.endDate })
    }
    return false
  }, [value, tempRange])

  // Check if date is in range
  const isDateInRange = useCallback((date: Date) => {
    if (tempRange.startDate && !tempRange.endDate) {
      return false
    }
    return isDateSelected(date)
  }, [isDateSelected, tempRange])

  // Format display text
  const displayText = useMemo(() => {
    if (value.preset !== 'custom') {
      return presetOptions.find(option => option.key === value.preset)?.label || ''
    }
    
    const startText = format(value.startDate, 'M/d', { locale: ja })
    const endText = format(value.endDate, 'M/d', { locale: ja })
    return `${startText} - ${endText}`
  }, [value])

  return (
    <Box>
      {/* Preset Buttons */}
      <ButtonGroup
        variant="outlined"
        size={size}
        sx={{
          mb: 2,
          '& .MuiButton-root': {
            borderRadius: 2,
            borderColor: alpha(theme.palette.divider, 0.2),
            '&:not(:last-of-type)': {
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            },
          },
        }}
      >
        {presetOptions.slice(0, 5).map((option) => (
          <motion.div key={option.key} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={value.preset === option.key ? 'contained' : 'outlined'}
              onClick={() => handlePresetClick(option.key)}
              disabled={disabled}
              sx={{
                minWidth: { xs: 60, sm: 80 },
                fontWeight: value.preset === option.key ? 600 : 400,
                background: value.preset === option.key 
                  ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                  : 'transparent',
                '&:hover': {
                  background: value.preset === option.key 
                    ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
                    : alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              {option.label}
            </Button>
          </motion.div>
        ))}
      </ButtonGroup>

      {/* Custom Date Range Button */}
      <Button
        id="date-range-button"
        variant="outlined"
        startIcon={<CalendarToday />}
        endIcon={value.preset === 'custom' ? <Chip label="カスタム" size="small" /> : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        disabled={disabled}
        sx={{
          borderRadius: 2,
          borderColor: alpha(theme.palette.divider, 0.2),
          background: value.preset === 'custom' 
            ? alpha(theme.palette.primary.main, 0.04)
            : 'transparent',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            background: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <Typography variant="body2" sx={{ mx: 1 }}>
          {displayText}
        </Typography>
      </Button>

      {/* Calendar Popover */}
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null)
          setTempRange({ startDate: null, endDate: null })
          setSelectingStart(true)
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 3,
            boxShadow: theme.shadows[12],
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'visible',
          },
        }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Paper sx={{ p: 3, minWidth: 320 }}>
                {/* Calendar Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <IconButton
                    onClick={() => setViewDate(subMonthsDate(viewDate, 1))}
                    size="small"
                    disabled={viewDate <= minDate}
                  >
                    <ChevronLeft />
                  </IconButton>
                  
                  <Typography variant="h6" fontWeight={600}>
                    {format(viewDate, 'yyyy年 M月', { locale: ja })}
                  </Typography>
                  
                  <IconButton
                    onClick={() => setViewDate(addMonths(viewDate, 1))}
                    size="small"
                    disabled={viewDate >= maxDate}
                  >
                    <ChevronRight />
                  </IconButton>
                </Box>

                {/* Weekday Headers */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 0.5,
                    mb: 1,
                  }}
                >
                  {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
                    <Box
                      key={day}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 32,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {day}
                    </Box>
                  ))}
                </Box>

                {/* Calendar Days */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 0.5,
                  }}
                >
                  {calendarDays.map((day) => {
                    const isCurrentMonth = day.getMonth() === viewDate.getMonth()
                    const isToday = isSameDay(day, new Date())
                    const isSelected = isDateSelected(day)
                    const isInRange = isDateInRange(day)
                    const isDisabled = day > maxDate || day < minDate

                    return (
                      <motion.div
                        key={day.toISOString()}
                        whileHover={!isDisabled ? { scale: 1.1 } : {}}
                        whileTap={!isDisabled ? { scale: 0.95 } : {}}
                      >
                        <Box
                          onClick={!isDisabled ? () => handleDateClick(day) : undefined}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 32,
                            borderRadius: 1,
                            cursor: isDisabled ? 'default' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 600 : 400,
                            color: isDisabled
                              ? theme.palette.text.disabled
                              : !isCurrentMonth
                              ? theme.palette.text.secondary
                              : isSelected
                              ? theme.palette.primary.contrastText
                              : theme.palette.text.primary,
                            backgroundColor: isSelected
                              ? theme.palette.primary.main
                              : isInRange
                              ? alpha(theme.palette.primary.main, 0.1)
                              : isToday
                              ? alpha(theme.palette.primary.main, 0.05)
                              : 'transparent',
                            border: isToday && !isSelected
                              ? `1px solid ${theme.palette.primary.main}`
                              : '1px solid transparent',
                            '&:hover': !isDisabled ? {
                              backgroundColor: isSelected
                                ? theme.palette.primary.dark
                                : alpha(theme.palette.primary.main, 0.08),
                            } : {},
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          {day.getDate()}
                        </Box>
                      </motion.div>
                    )
                  })}
                </Box>

                {/* Selection Info */}
                {(tempRange.startDate || tempRange.endDate) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary">
                      {tempRange.startDate && !tempRange.endDate
                        ? '終了日を選択してください'
                        : '範囲が選択されました'
                      }
                    </Typography>
                  </>
                )}
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Popover>
    </Box>
  )
})

DateRangePicker.displayName = 'DateRangePicker'

export default DateRangePicker