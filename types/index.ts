// 市場最強分析システム - 型定義

// ==== AIアシスタント関連 ====
export interface AIMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  attachments?: ChartData | TableData | ActionData;
  isLoading?: boolean;
}

export interface AIResponse {
  message: string;
  confidence: number; // 0-1
  data?: any;
  actions?: SuggestedAction[];
  charts?: ChartConfig[];
}

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  category: 'pricing' | 'promotion' | 'inventory' | 'marketing';
  impact: number; // 予想売上影響額
  difficulty: 'easy' | 'medium' | 'hard';
  executionTime: number; // 分
  parameters?: ActionParameter[];
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

// ==== 売上データ関連 ====
export interface SalesData {
  id: string;
  timestamp: Date;
  orderId: string;
  productId: string;
  customerId?: string;
  amount: number;
  quantity: number;
  source: 'web' | 'mobile' | 'store' | 'api';
  campaignId?: string;
  metadata?: Record<string, any>;
}

export interface SalesMetrics {
  totalSales: number;
  salesCount: number;
  averageOrderValue: number;
  conversionRate: number;
  period: 'today' | 'week' | 'month' | 'quarter' | 'year';
  previousPeriodComparison: number; // パーセンテージ変化
}

export interface SalesPrediction {
  period: string;
  predictedSales: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  impact: number; // -1 to 1
  confidence: number; // 0 to 1
}

// ==== インサイト・分析関連 ====
export interface AIInsight {
  id: string;
  type: 'anomaly' | 'opportunity' | 'prediction' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  impactEstimate: number; // 売上影響額
  actionRequired: boolean;
  suggestedActions: SuggestedAction[];
  createdAt: Date;
  status: 'active' | 'dismissed' | 'implemented';
  metadata?: Record<string, any>;
}

export interface Anomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number; // パーセンテージ
  severity: 'minor' | 'major' | 'critical';
  possibleCauses: string[];
}

// ==== データ可視化関連 ====
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: any[];
  config: ChartConfig;
}

export interface ChartConfig {
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  height?: number;
}

export interface TableData {
  headers: string[];
  rows: any[][];
  sortable?: boolean;
  searchable?: boolean;
  pagination?: boolean;
}

// ==== ユーザー・認証関連 ====
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  permissions: string[];
  createdAt: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'ja' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
  };
  dashboard: {
    defaultView: string;
    refreshInterval: number;
    favoriteCharts: string[];
  };
}

// ==== API・GraphQL関連 ====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
  };
}

export interface PaginationInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ==== システム関連 ====
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    ai: ServiceStatus;
    external: ServiceStatus;
  };
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    requestsPerSecond: number;
  };
  lastChecked: Date;
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastError?: string;
}

// ==== イベント・ログ関連 ====
export interface SystemEvent {
  id: string;
  type: 'user_action' | 'system_event' | 'ai_interaction' | 'data_update';
  userId?: string;
  action: string;
  data?: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  service: string;
  userId?: string;
  requestId?: string;
  data?: any;
}

// ==== 設定・構成関連 ====
export interface AppConfig {
  features: {
    aiAssistant: boolean;
    realTimeUpdates: boolean;
    predictions: boolean;
    automation: boolean;
  };
  limits: {
    aiQueriesPerMinute: number;
    dataRetentionDays: number;
    maxFileUploadSize: number;
  };
  integrations: {
    googleAnalytics: boolean;
    stripe: boolean;
    slack: boolean;
    email: boolean;
  };
}

// ==== フォーム・UI関連 ====
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'textarea' | 'checkbox' | 'date';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: any; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
}

export interface UIComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: UIComponent[];
}

// ==== エクスポート用のユニオン型 ====
export type MessageType = AIMessage['type'];
export type InsightType = AIInsight['type'];
export type ChartType = ChartData['type'];
export type UserRole = User['role'];
export type SystemStatus = SystemHealth['status'];