// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// User Types
export interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  updatedAt: string
}

// Authentication Types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

// Analytics Types
export interface AnalyticsSummary {
  totalVisitors: number
  totalPageviews: number
  conversionRate: number
  bounceRate: number
  averageSessionDuration: number
}

export interface PageAnalytics {
  path: string
  pageviews: number
  uniqueVisitors: number
  averageTimeOnPage: number
  bounceRate: number
}

// Website Types
export interface Website {
  id: string
  name: string
  url: string
  trackingCode: string
  userId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateWebsiteData {
  name: string
  url: string
}

// Dashboard & Chart Types
export interface ChartDataPoint {
  timestamp: string
  date: string
  visitors: number
  pageviews: number
  sessions: number
  bounceRate: number
  avgSessionDuration: number
}

export interface MetricCard {
  id: string
  title: string
  value: number
  previousValue: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  format: 'number' | 'percentage' | 'duration' | 'currency'
  icon: string
  color: string
}

export interface DashboardConfig {
  refreshInterval: number
  defaultDateRange: DateRange
  visibleCharts: string[]
  customLayout: LayoutConfig[]
}

export interface LayoutConfig {
  id: string
  x: number
  y: number
  width: number
  height: number
  component: string
}

// Date Range & Filter Types
export type DateRangePreset = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'custom'

export interface DateRange {
  startDate: Date
  endDate: Date
  preset: DateRangePreset
}

export interface DashboardFilters {
  dateRange: DateRange
  devices: string[]
  browsers: string[]
  countries: string[]
  referrers: string[]
  pages: string[]
}

// Real-time Analytics Types
export interface RealtimeData {
  currentVisitors: number
  visitorsByCountry: CountryVisitors[]
  topPages: PopularPage[]
  recentEvents: AnalyticsEvent[]
  serverStatus: 'online' | 'offline' | 'degraded'
}

export interface CountryVisitors {
  country: string
  countryCode: string
  visitors: number
  percentage: number
}

export interface PopularPage {
  path: string
  title: string
  visitors: number
  pageviews: number
  avgTimeOnPage: number
  bounceRate: number
}

export interface AnalyticsEvent {
  id: string
  type: 'pageview' | 'event' | 'conversion'
  timestamp: string
  page: string
  userAgent: string
  country: string
  referrer?: string
}

// Export Types
export type ExportFormat = 'csv' | 'pdf' | 'excel' | 'json'

export interface ExportOptions {
  format: ExportFormat
  dateRange: DateRange
  includedMetrics: string[]
  chartTypes: string[]
  filename?: string
}

// Performance & Virtual List Types
export interface VirtualListItem {
  id: string
  height: number
  data: any
}

export interface PerformanceMetrics {
  renderTime: number
  bundleSize: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
}

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  mode: ThemeMode
  primaryColor: string
  accentColor: string
  borderRadius: number
  fontSize: 'small' | 'medium' | 'large'
}

// API Extended Types
export interface AnalyticsTimeSeriesData {
  data: ChartDataPoint[]
  total: number
  growth: number
  period: string
}

export interface DashboardData {
  summary: AnalyticsSummary
  timeSeries: AnalyticsTimeSeriesData
  realtime: RealtimeData
  topPages: PopularPage[]
  trafficSources: TrafficSource[]
  deviceStats: DeviceStats[]
  geographyData: GeographyData[]
}

export interface TrafficSource {
  source: string
  type: 'direct' | 'referral' | 'organic' | 'social' | 'email' | 'paid'
  visitors: number
  sessions: number
  bounceRate: number
  conversionRate: number
}

export interface DeviceStats {
  device: string
  type: 'desktop' | 'mobile' | 'tablet'
  visitors: number
  sessions: number
  avgSessionDuration: number
}

export interface GeographyData {
  country: string
  countryCode: string
  region?: string
  city?: string
  visitors: number
  sessions: number
  bounceRate: number
}