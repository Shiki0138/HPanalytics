// 売上データ管理ユーティリティ

import { SalesData, SalesMetrics, SalesPrediction } from '@/types';

// 売上データ生成・管理クラス
export class SalesDataService {
  private static instance: SalesDataService;
  private salesCache: Map<string, SalesData[]> = new Map();

  static getInstance(): SalesDataService {
    if (!SalesDataService.instance) {
      SalesDataService.instance = new SalesDataService();
    }
    return SalesDataService.instance;
  }

  // 期間別売上データ取得
  async getSalesData(
    period: 'today' | 'week' | 'month' | 'quarter' | 'year',
    includeDetails: boolean = false
  ): Promise<SalesData[]> {
    const cacheKey = `${period}_${includeDetails}`;
    
    if (this.salesCache.has(cacheKey)) {
      return this.salesCache.get(cacheKey)!;
    }

    // 実際の実装ではAPIコールまたはデータベースクエリ
    const data = this.generateMockSalesData(period);
    this.salesCache.set(cacheKey, data);
    
    return data;
  }

  // 売上メトリクス計算
  async getSalesMetrics(period: 'today' | 'week' | 'month' | 'quarter' | 'year'): Promise<SalesMetrics> {
    const salesData = await this.getSalesData(period);
    const previousPeriodData = await this.getSalesData(period); // 実際は前期間データ

    const totalSales = salesData.reduce((sum, item) => sum + item.amount, 0);
    const salesCount = salesData.length;
    const averageOrderValue = salesCount > 0 ? totalSales / salesCount : 0;

    // 前期間との比較
    const previousTotalSales = previousPeriodData.reduce((sum, item) => sum + item.amount, 0);
    const previousPeriodComparison = previousTotalSales > 0 
      ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
      : 0;

    return {
      totalSales,
      salesCount,
      averageOrderValue,
      conversionRate: 3.2, // 実際は計算ロジック
      period,
      previousPeriodComparison
    };
  }

  // リアルタイム売上データ取得
  async getRealtimeSales(): Promise<{
    currentValue: number;
    change24h: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    // WebSocket や polling で実装
    const now = Date.now();
    const currentValue = Math.round(50000 + Math.sin(now / 100000) * 20000);
    const change24h = Math.round((Math.random() - 0.5) * 10000);
    
    return {
      currentValue,
      change24h,
      trend: change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'stable'
    };
  }

  // 売上予測データ生成
  async getSalesPrediction(days: number = 30): Promise<SalesPrediction[]> {
    const predictions: SalesPrediction[] = [];
    const baseValue = 100000;
    
    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // 簡単な予測モデル（実際はMLモデル）
      const seasonalFactor = 1 + Math.sin((i / 7) * Math.PI * 2) * 0.1;
      const trendFactor = 1 + (i / days) * 0.05;
      const randomFactor = 1 + (Math.random() - 0.5) * 0.2;
      
      const predictedValue = Math.round(baseValue * seasonalFactor * trendFactor * randomFactor);
      const confidence = Math.max(0.6, 1 - (i / days) * 0.4);
      
      predictions.push({
        period: date.toISOString().split('T')[0],
        predictedSales: predictedValue,
        confidenceInterval: {
          lower: Math.round(predictedValue * (1 - (1 - confidence) * 0.3)),
          upper: Math.round(predictedValue * (1 + (1 - confidence) * 0.3))
        },
        factors: [
          { name: '季節性', impact: seasonalFactor - 1, confidence: 0.8 },
          { name: 'トレンド', impact: trendFactor - 1, confidence: 0.7 },
          { name: 'ランダム要因', impact: randomFactor - 1, confidence: 0.5 }
        ]
      });
    }
    
    return predictions;
  }

  // 商品別売上分析
  async getProductSalesAnalysis(productId?: string): Promise<{
    topProducts: Array<{
      productId: string;
      productName: string;
      sales: number;
      growth: number;
    }>;
    underperforming: Array<{
      productId: string;
      productName: string;
      sales: number;
      decline: number;
    }>;
  }> {
    // 実際はデータベースから取得
    return {
      topProducts: [
        { productId: 'p1', productName: 'プレミアムプラン', sales: 250000, growth: 15.3 },
        { productId: 'p2', productName: 'スタンダードプラン', sales: 180000, growth: 8.7 },
        { productId: 'p3', productName: 'ベーシックプラン', sales: 120000, growth: 5.2 }
      ],
      underperforming: [
        { productId: 'p4', productName: 'レガシープラン', sales: 45000, decline: -12.4 },
        { productId: 'p5', productName: '試用版', sales: 15000, decline: -8.1 }
      ]
    };
  }

  // 顧客セグメント別分析
  async getCustomerSegmentAnalysis(): Promise<{
    segments: Array<{
      name: string;
      customerCount: number;
      averageValue: number;
      totalSales: number;
      growthRate: number;
    }>;
  }> {
    return {
      segments: [
        {
          name: '新規顧客',
          customerCount: 1250,
          averageValue: 15000,
          totalSales: 1875000,
          growthRate: 23.5
        },
        {
          name: 'リピート顧客',
          customerCount: 850,
          averageValue: 35000,
          totalSales: 2975000,
          growthRate: 12.8
        },
        {
          name: 'VIP顧客',
          customerCount: 95,
          averageValue: 125000,
          totalSales: 1187500,
          growthRate: 8.3
        }
      ]
    };
  }

  // 売上異常検知
  async detectSalesAnomalies(): Promise<Array<{
    timestamp: Date;
    type: 'spike' | 'drop' | 'unusual_pattern';
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    expectedValue: number;
    possibleCauses: string[];
  }>> {
    // 実際は機械学習モデルで異常検知
    const now = new Date();
    return [
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2時間前
        type: 'spike',
        severity: 'medium',
        description: '午後2時頃に売上が急激に増加',
        value: 145000,
        expectedValue: 85000,
        possibleCauses: [
          'プロモーション効果',
          'メディア露出',
          '競合他社のサービス停止'
        ]
      },
      {
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6時間前
        type: 'drop',
        severity: 'low',
        description: '朝の時間帯で売上が予想より低い',
        value: 32000,
        expectedValue: 45000,
        possibleCauses: [
          '通勤時間のトラフィック減少',
          'システムレスポンス遅延',
          '決済エラー増加'
        ]
      }
    ];
  }

  // 売上データエクスポート
  async exportSalesData(
    format: 'csv' | 'json' | 'excel',
    period: string,
    filters?: any
  ): Promise<string> {
    const data = await this.getSalesData('month', true);
    
    switch (format) {
      case 'csv':
        return this.convertToCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'excel':
        // 実際はExcel形式に変換
        return 'Excel export not implemented yet';
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // プライベートメソッド
  private generateMockSalesData(period: string): SalesData[] {
    const now = new Date();
    const data: SalesData[] = [];
    
    let daysBack: number;
    switch (period) {
      case 'today': daysBack = 1; break;
      case 'week': daysBack = 7; break;
      case 'month': daysBack = 30; break;
      case 'quarter': daysBack = 90; break;
      case 'year': daysBack = 365; break;
      default: daysBack = 30;
    }

    for (let i = 0; i < daysBack * 5; i++) { // 1日あたり5件の取引
      const timestamp = new Date(now.getTime() - (Math.random() * daysBack * 24 * 60 * 60 * 1000));
      
      data.push({
        id: `order_${i + 1}`,
        timestamp,
        orderId: `ORD-${Date.now()}-${i}`,
        productId: `product_${Math.floor(Math.random() * 10) + 1}`,
        customerId: Math.random() > 0.3 ? `customer_${Math.floor(Math.random() * 100) + 1}` : undefined,
        amount: Math.round(1000 + Math.random() * 49000),
        quantity: Math.floor(Math.random() * 3) + 1,
        source: ['web', 'mobile', 'store', 'api'][Math.floor(Math.random() * 4)] as any,
        campaignId: Math.random() > 0.7 ? `campaign_${Math.floor(Math.random() * 5) + 1}` : undefined,
        metadata: {
          paymentMethod: ['card', 'bank', 'digital'][Math.floor(Math.random() * 3)],
          region: ['tokyo', 'osaka', 'nagoya'][Math.floor(Math.random() * 3)]
        }
      });
    }

    return data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private convertToCSV(data: SalesData[]): string {
    const headers = ['ID', 'Timestamp', 'Order ID', 'Product ID', 'Customer ID', 'Amount', 'Quantity', 'Source'];
    const rows = data.map(item => [
      item.id,
      item.timestamp.toISOString(),
      item.orderId,
      item.productId,
      item.customerId || '',
      item.amount,
      item.quantity,
      item.source
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// シングルトンエクスポート
export const salesDataService = SalesDataService.getInstance();

// ユーティリティ関数
export const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString('ja-JP')}`;
};

export const formatPercentage = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const getGrowthTrend = (growthRate: number): 'up' | 'down' | 'stable' => {
  if (growthRate > 2) return 'up';
  if (growthRate < -2) return 'down';
  return 'stable';
};

// データ集計ユーティリティ
export const aggregateSalesByPeriod = (
  data: SalesData[], 
  period: 'hour' | 'day' | 'week' | 'month'
): Array<{ period: string; sales: number; count: number }> => {
  const grouped = new Map<string, { sales: number; count: number }>();

  data.forEach(item => {
    let periodKey: string;
    const date = new Date(item.timestamp);

    switch (period) {
      case 'hour':
        periodKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        periodKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
        break;
      case 'month':
        periodKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        break;
      default:
        periodKey = date.toDateString();
    }

    if (grouped.has(periodKey)) {
      const existing = grouped.get(periodKey)!;
      grouped.set(periodKey, {
        sales: existing.sales + item.amount,
        count: existing.count + 1
      });
    } else {
      grouped.set(periodKey, {
        sales: item.amount,
        count: 1
      });
    }
  });

  return Array.from(grouped.entries()).map(([period, data]) => ({
    period,
    sales: data.sales,
    count: data.count
  })).sort((a, b) => a.period.localeCompare(b.period));
};