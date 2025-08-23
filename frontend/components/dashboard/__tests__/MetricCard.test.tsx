import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import MetricCard from '../MetricCard'
import { MetricCard as MetricCardType } from '@/types'

const theme = createTheme()

const mockMetric: MetricCardType = {
  id: '1',
  title: 'Page Views',
  value: 12500,
  previousValue: 11000,
  change: 13.6,
  format: 'number',
  icon: '👁️',
  color: '#1976d2',
}

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  )
}

describe('MetricCard Component', () => {
  it('renders metric card with basic data', () => {
    renderWithTheme(<MetricCard metric={mockMetric} />)
    
    expect(screen.getByText('Page Views')).toBeInTheDocument()
    expect(screen.getByText('12,500')).toBeInTheDocument()
    expect(screen.getByText('👁️')).toBeInTheDocument()
  })

  it('displays loading state correctly', () => {
    renderWithTheme(<MetricCard metric={mockMetric} loading />)
    
    expect(screen.getByText('---')).toBeInTheDocument()
    expect(screen.queryByText('12,500')).not.toBeInTheDocument()
  })

  it('formats percentage values correctly', () => {
    const percentageMetric = {
      ...mockMetric,
      value: 45.67,
      format: 'percentage' as const,
    }
    
    renderWithTheme(<MetricCard metric={percentageMetric} />)
    
    expect(screen.getByText('45.7%')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    const currencyMetric = {
      ...mockMetric,
      value: 1500000,
      format: 'currency' as const,
    }
    
    renderWithTheme(<MetricCard metric={currencyMetric} />)
    
    expect(screen.getByText('¥1,500,000')).toBeInTheDocument()
  })

  it('formats duration values correctly', () => {
    const durationMetric = {
      ...mockMetric,
      value: 125,
      format: 'duration' as const,
    }
    
    renderWithTheme(<MetricCard metric={durationMetric} />)
    
    expect(screen.getByText('2分')).toBeInTheDocument()
  })

  it('formats large numbers with K suffix', () => {
    const largeNumberMetric = {
      ...mockMetric,
      value: 5500,
    }
    
    renderWithTheme(<MetricCard metric={largeNumberMetric} />)
    
    expect(screen.getByText('5.5K')).toBeInTheDocument()
  })

  it('formats very large numbers with M suffix', () => {
    const veryLargeNumberMetric = {
      ...mockMetric,
      value: 2500000,
    }
    
    renderWithTheme(<MetricCard metric={veryLargeNumberMetric} />)
    
    expect(screen.getByText('2.5M')).toBeInTheDocument()
  })

  it('shows positive change indicator', () => {
    renderWithTheme(<MetricCard metric={mockMetric} />)
    
    expect(screen.getByText('+13.6%')).toBeInTheDocument()
    expect(screen.getByText('vs 前回')).toBeInTheDocument()
  })

  it('shows negative change indicator', () => {
    const negativeChangeMetric = {
      ...mockMetric,
      change: -5.2,
    }
    
    renderWithTheme(<MetricCard metric={negativeChangeMetric} />)
    
    expect(screen.getByText('-5.2%')).toBeInTheDocument()
  })

  it('hides trend when showTrend is false', () => {
    renderWithTheme(<MetricCard metric={mockMetric} showTrend={false} />)
    
    expect(screen.queryByText('+13.6%')).not.toBeInTheDocument()
  })

  it('calls onClick when card is clicked', () => {
    const handleClick = jest.fn()
    
    renderWithTheme(<MetricCard metric={mockMetric} onClick={handleClick} />)
    
    fireEvent.click(screen.getByRole('button', { name: /page views/i }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('calls onMenuClick when menu button is clicked', () => {
    const handleMenuClick = jest.fn()
    
    renderWithTheme(<MetricCard metric={mockMetric} onMenuClick={handleMenuClick} />)
    
    const menuButton = screen.getByLabelText('More')
    fireEvent.click(menuButton)
    
    expect(handleMenuClick).toHaveBeenCalledTimes(1)
  })

  it('prevents event propagation on menu click', () => {
    const handleClick = jest.fn()
    const handleMenuClick = jest.fn()
    
    renderWithTheme(
      <MetricCard 
        metric={mockMetric} 
        onClick={handleClick} 
        onMenuClick={handleMenuClick} 
      />
    )
    
    const menuButton = screen.getByLabelText('More')
    fireEvent.click(menuButton)
    
    expect(handleMenuClick).toHaveBeenCalledTimes(1)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders different sizes correctly', () => {
    const { rerender } = renderWithTheme(
      <MetricCard metric={mockMetric} size="small" />
    )
    
    // Small size should have smaller dimensions
    let card = screen.getByRole('button', { name: /page views/i })
    expect(card).toHaveStyle({ minHeight: '120px' })
    
    rerender(
      <ThemeProvider theme={theme}>
        <MetricCard metric={mockMetric} size="large" />
      </ThemeProvider>
    )
    
    // Large size should have larger dimensions
    card = screen.getByRole('button', { name: /page views/i })
    expect(card).toHaveStyle({ minHeight: '200px' })
  })

  it('handles metric without previous value', () => {
    const metricWithoutPrevious = {
      ...mockMetric,
      previousValue: undefined,
      change: 0,
    }
    
    renderWithTheme(<MetricCard metric={metricWithoutPrevious} />)
    
    expect(screen.queryByText('vs 前回')).not.toBeInTheDocument()
  })

  it('renders sparkline when showSparkline is true and data is provided', () => {
    const sparklineData = [10, 15, 12, 18, 16, 20, 25]
    
    renderWithTheme(
      <MetricCard 
        metric={mockMetric} 
        showSparkline 
        sparklineData={sparklineData}
      />
    )
    
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument() // SVG element
  })

  it('does not render sparkline when data is empty', () => {
    renderWithTheme(
      <MetricCard 
        metric={mockMetric} 
        showSparkline 
        sparklineData={[]}
      />
    )
    
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
  })

  it('applies custom styles for different metric colors', () => {
    const redMetric = {
      ...mockMetric,
      color: '#f44336',
    }
    
    renderWithTheme(<MetricCard metric={redMetric} />)
    
    const iconContainer = screen.getByText('👁️').closest('div')
    expect(iconContainer).toHaveStyle({ color: '#f44336' })
  })

  it('shows info tooltip', () => {
    renderWithTheme(<MetricCard metric={mockMetric} />)
    
    const infoButton = screen.getByLabelText('詳細情報')
    expect(infoButton).toBeInTheDocument()
  })

  it('handles zero change correctly', () => {
    const noChangeMetric = {
      ...mockMetric,
      change: 0,
    }
    
    renderWithTheme(<MetricCard metric={noChangeMetric} />)
    
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })

  it('displays correct text for duration less than 60 seconds', () => {
    const shortDurationMetric = {
      ...mockMetric,
      value: 45,
      format: 'duration' as const,
    }
    
    renderWithTheme(<MetricCard metric={shortDurationMetric} />)
    
    expect(screen.getByText('45秒')).toBeInTheDocument()
  })

  it('displays correct text for duration in hours', () => {
    const hourDurationMetric = {
      ...mockMetric,
      value: 7200, // 2 hours
      format: 'duration' as const,
    }
    
    renderWithTheme(<MetricCard metric={hourDurationMetric} />)
    
    expect(screen.getByText('2時間')).toBeInTheDocument()
  })
})