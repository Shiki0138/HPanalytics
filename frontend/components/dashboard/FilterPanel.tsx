'use client'

import React, { memo, useState, useCallback, useMemo } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Autocomplete,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
  Badge,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material'
import {
  FilterList,
  ExpandMore,
  Clear,
  Search,
  DeviceHub,
  Language,
  Public,
  Link as LinkIcon,
  Pages,
  Close,
  RestartAlt,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardFilters } from '@/types'

interface FilterOption {
  id: string
  label: string
  value: string
  count?: number
  icon?: React.ReactNode
  category?: string
}

interface FilterPanelProps {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
  options: {
    devices: FilterOption[]
    browsers: FilterOption[]
    countries: FilterOption[]
    referrers: FilterOption[]
    pages: FilterOption[]
  }
  isOpen: boolean
  onToggle: () => void
  appliedFiltersCount: number
}

const FilterPanel = memo(({
  filters,
  onChange,
  options,
  isOpen,
  onToggle,
  appliedFiltersCount,
}: FilterPanelProps) => {
  const theme = useTheme()
  const [searchQueries, setSearchQueries] = useState({
    devices: '',
    browsers: '',
    countries: '',
    referrers: '',
    pages: '',
  })

  // Handle filter change
  const handleFilterChange = useCallback((
    filterType: keyof Omit<DashboardFilters, 'dateRange'>,
    values: string[]
  ) => {
    onChange({
      ...filters,
      [filterType]: values,
    })
  }, [filters, onChange])

  // Clear all filters
  const handleClearAll = useCallback(() => {
    onChange({
      ...filters,
      devices: [],
      browsers: [],
      countries: [],
      referrers: [],
      pages: [],
    })
  }, [filters, onChange])

  // Filter options based on search query
  const getFilteredOptions = useCallback((
    optionList: FilterOption[],
    searchQuery: string
  ) => {
    if (!searchQuery) return optionList
    
    return optionList.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.value.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [])

  // Get filter section config
  const filterSections = useMemo(() => [
    {
      id: 'devices',
      title: 'デバイス',
      icon: <DeviceHub />,
      options: getFilteredOptions(options.devices, searchQueries.devices),
      selectedValues: filters.devices,
      searchQuery: searchQueries.devices,
      placeholder: 'デバイスを検索...',
    },
    {
      id: 'browsers',
      title: 'ブラウザ',
      icon: <Language />,
      options: getFilteredOptions(options.browsers, searchQueries.browsers),
      selectedValues: filters.browsers,
      searchQuery: searchQueries.browsers,
      placeholder: 'ブラウザを検索...',
    },
    {
      id: 'countries',
      title: '国・地域',
      icon: <Public />,
      options: getFilteredOptions(options.countries, searchQueries.countries),
      selectedValues: filters.countries,
      searchQuery: searchQueries.countries,
      placeholder: '国・地域を検索...',
    },
    {
      id: 'referrers',
      title: '参照元',
      icon: <LinkIcon />,
      options: getFilteredOptions(options.referrers, searchQueries.referrers),
      selectedValues: filters.referrers,
      searchQuery: searchQueries.referrers,
      placeholder: '参照元を検索...',
    },
    {
      id: 'pages',
      title: 'ページ',
      icon: <Pages />,
      options: getFilteredOptions(options.pages, searchQueries.pages),
      selectedValues: filters.pages,
      searchQuery: searchQueries.pages,
      placeholder: 'ページを検索...',
    },
  ], [options, filters, searchQueries, getFilteredOptions])

  // Filter toggle button
  const FilterToggleButton = memo(() => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Tooltip title={isOpen ? 'フィルターを閉じる' : 'フィルターを開く'}>
        <IconButton
          onClick={onToggle}
          sx={{
            background: isOpen
              ? alpha(theme.palette.primary.main, 0.1)
              : 'transparent',
            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: 2,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              background: alpha(theme.palette.primary.main, 0.15),
              borderColor: theme.palette.primary.main,
            },
          }}
        >
          <Badge
            badgeContent={appliedFiltersCount}
            color="primary"
            invisible={appliedFiltersCount === 0}
            sx={{
              '& .MuiBadge-badge': {
                transform: 'scale(0.8)',
                minWidth: 16,
                height: 16,
              },
            }}
          >
            <FilterList />
          </Badge>
        </IconButton>
      </Tooltip>
    </motion.div>
  ))

  FilterToggleButton.displayName = 'FilterToggleButton'

  return (
    <>
      <FilterToggleButton />
      
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={onToggle}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ height: '100%' }}
            >
              <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FilterList color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      フィルター
                    </Typography>
                    {appliedFiltersCount > 0 && (
                      <Chip
                        label={`${appliedFiltersCount}個適用中`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <IconButton onClick={onToggle} size="small">
                    <Close />
                  </IconButton>
                </Box>

                {/* Clear All Button */}
                {appliedFiltersCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<RestartAlt />}
                      onClick={handleClearAll}
                      fullWidth
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        color: theme.palette.warning.main,
                        borderColor: alpha(theme.palette.warning.main, 0.3),
                        '&:hover': {
                          borderColor: theme.palette.warning.main,
                          background: alpha(theme.palette.warning.main, 0.04),
                        },
                      }}
                    >
                      すべてクリア
                    </Button>
                  </motion.div>
                )}

                <Divider sx={{ mb: 2 }} />

                {/* Filter Sections */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {filterSections.map((section, index) => (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <Accordion
                        defaultExpanded={section.selectedValues.length > 0}
                        sx={{
                          mb: 1,
                          borderRadius: 2,
                          '&:before': { display: 'none' },
                          boxShadow: 'none',
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMore />}
                          sx={{
                            borderRadius: 2,
                            '&:hover': {
                              background: alpha(theme.palette.primary.main, 0.02),
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ color: theme.palette.primary.main }}>
                              {section.icon}
                            </Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {section.title}
                            </Typography>
                            {section.selectedValues.length > 0 && (
                              <Chip
                                label={section.selectedValues.length}
                                size="small"
                                color="primary"
                                sx={{ ml: 'auto', mr: 1 }}
                              />
                            )}
                          </Box>
                        </AccordionSummary>
                        
                        <AccordionDetails sx={{ px: 2, pb: 2 }}>
                          {/* Search Field */}
                          <TextField
                            fullWidth
                            size="small"
                            placeholder={section.placeholder}
                            value={section.searchQuery}
                            onChange={(e) => setSearchQueries(prev => ({
                              ...prev,
                              [section.id]: e.target.value,
                            }))}
                            InputProps={{
                              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                              endAdornment: section.searchQuery && (
                                <IconButton
                                  size="small"
                                  onClick={() => setSearchQueries(prev => ({
                                    ...prev,
                                    [section.id]: '',
                                  }))}
                                >
                                  <Clear fontSize="small" />
                                </IconButton>
                              ),
                            }}
                            sx={{
                              mb: 2,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />

                          {/* Filter Options */}
                          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {section.options.length === 0 ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', textAlign: 'center', py: 2 }}
                              >
                                該当する項目がありません
                              </Typography>
                            ) : (
                              section.options.map((option) => (
                                <motion.div
                                  key={option.id}
                                  whileHover={{ x: 2 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={section.selectedValues.includes(option.value)}
                                        onChange={(e) => {
                                          const newValues = e.target.checked
                                            ? [...section.selectedValues, option.value]
                                            : section.selectedValues.filter(v => v !== option.value)
                                          
                                          handleFilterChange(
                                            section.id as keyof Omit<DashboardFilters, 'dateRange'>,
                                            newValues
                                          )
                                        }}
                                        size="small"
                                        sx={{
                                          '&.Mui-checked': {
                                            color: theme.palette.primary.main,
                                          },
                                        }}
                                      />
                                    }
                                    label={
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          width: '100%',
                                          py: 0.5,
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {option.icon}
                                          <Typography variant="body2">
                                            {option.label}
                                          </Typography>
                                        </Box>
                                        {option.count !== undefined && (
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                              background: alpha(theme.palette.text.secondary, 0.1),
                                              px: 1,
                                              borderRadius: 1,
                                              minWidth: 24,
                                              textAlign: 'center',
                                            }}
                                          >
                                            {option.count.toLocaleString()}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                    sx={{
                                      width: '100%',
                                      margin: 0,
                                      borderRadius: 1,
                                      '&:hover': {
                                        background: alpha(theme.palette.primary.main, 0.02),
                                      },
                                    }}
                                  />
                                </motion.div>
                              ))
                            )}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </motion.div>
                  ))}
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Drawer>
    </>
  )
})

FilterPanel.displayName = 'FilterPanel'

export default FilterPanel