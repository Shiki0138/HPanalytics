// リアルタイムデータ処理サービス

import { EventEmitter } from 'events';
import React from 'react';

export interface RealTimeData {
  timestamp: Date;
  type: 'sales' | 'traffic' | 'conversion' | 'alert';
  data: any;
  metadata?: Record<string, any>;
}

export interface SalesUpdate {
  currentSales: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  timestamp: Date;
}

export interface TrafficUpdate {
  currentVisitors: number;
  conversionRate: number;
  topPages: Array<{ page: string; visitors: number }>;
  timestamp: Date;
}

// リアルタイムデータサービス
export class RealTimeService extends EventEmitter {
  private static instance: RealTimeService;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  private updateInterval: number = 30000; // 30秒
  private intervalId?: NodeJS.Timeout;

  // WebSocket接続（実際の実装では WebSocket を使用）
  private ws?: WebSocket;

  static getInstance(): RealTimeService {
    if (!RealTimeService.instance) {
      RealTimeService.instance = new RealTimeService();
    }
    return RealTimeService.instance;
  }

  // リアルタイム接続開始
  async connect(): Promise<void> {
    try {
      // 本番環境では WebSocket サーバーに接続
      if (typeof window !== 'undefined') {
        // この例では polling で代用（実際は WebSocket）
        this.startPolling();
      } else {
        // サーバーサイドでは別の仕組み
        this.simulateConnection();
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');

      console.log('✅ リアルタイムデータサービス接続完了');
    } catch (error) {
      console.error('❌ リアルタイム接続エラー:', error);
      this.handleConnectionError();
    }
  }

  // 接続終了
  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.isConnected = false;
    this.emit('disconnected');
    console.log('🔌 リアルタイムデータサービス切断');
  }

  // 売上データの購読
  subscribeSalesUpdates(): void {
    this.on('sales_update', (data: SalesUpdate) => {
      // コンポーネントでこのイベントをリスンする
    });
  }

  // トラフィックデータの購読
  subscribeTrafficUpdates(): void {
    this.on('traffic_update', (data: TrafficUpdate) => {
      // コンポーネントでこのイベントをリスンする
    });
  }

  // アラートの購読
  subscribeAlerts(): void {
    this.on('alert', (alert: any) => {
      // 緊急アラートの処理
    });
  }

  // 現在の接続状態
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    lastUpdate?: Date;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastUpdate: new Date()
    };
  }

  // プライベートメソッド
  private startPolling(): void {
    this.intervalId = setInterval(async () => {
      try {
        await this.fetchAndEmitUpdates();
      } catch (error) {
        console.error('データ取得エラー:', error);
      }
    }, this.updateInterval);

    // 初回実行
    this.fetchAndEmitUpdates();
  }

  private async fetchAndEmitUpdates(): Promise<void> {
    // 実際の API エンドポイントから データを取得
    const salesData = await this.fetchSalesData();
    const trafficData = await this.fetchTrafficData();
    const alerts = await this.fetchAlerts();

    // データ更新イベントを発火
    this.emit('sales_update', salesData);
    this.emit('traffic_update', trafficData);

    // アラートがあれば通知
    if (alerts.length > 0) {
      alerts.forEach(alert => this.emit('alert', alert));
    }

    this.emit('data_updated', {
      timestamp: new Date(),
      sales: salesData,
      traffic: trafficData,
      alerts
    });
  }

  private async fetchSalesData(): Promise<SalesUpdate> {
    // 模擬データ生成（実際は API から取得）
    const now = new Date();
    const baseValue = 100000;
    const variation = Math.sin(now.getTime() / 60000) * 20000; // 時間による変動
    const noise = (Math.random() - 0.5) * 10000; // ランダムノイズ
    
    const currentSales = Math.max(0, baseValue + variation + noise);
    const previousValue = baseValue + Math.sin((now.getTime() - 60000) / 60000) * 20000;
    const change = currentSales - previousValue;
    
    return {
      currentSales: Math.round(currentSales),
      change: Math.round(change),
      trend: change > 1000 ? 'up' : change < -1000 ? 'down' : 'stable',
      timestamp: now
    };
  }

  private async fetchTrafficData(): Promise<TrafficUpdate> {
    // 模擬トラフィックデータ
    const now = new Date();
    const hour = now.getHours();
    
    // 時間帯による訪問者数の変動
    let baseVisitors = 50;
    if (hour >= 9 && hour <= 17) {
      baseVisitors = 150; // 営業時間は多め
    } else if (hour >= 18 && hour <= 22) {
      baseVisitors = 200; // 夜間はピーク
    }
    
    const currentVisitors = Math.round(baseVisitors + (Math.random() - 0.5) * 50);
    const conversionRate = Math.round((2.5 + (Math.random() - 0.5) * 2) * 100) / 100;
    
    return {
      currentVisitors,
      conversionRate,
      topPages: [
        { page: '/pricing', visitors: Math.round(currentVisitors * 0.3) },
        { page: '/features', visitors: Math.round(currentVisitors * 0.25) },
        { page: '/dashboard', visitors: Math.round(currentVisitors * 0.2) },
        { page: '/support', visitors: Math.round(currentVisitors * 0.15) },
      ],
      timestamp: now
    };
  }

  private async fetchAlerts(): Promise<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
  }>> {
    const alerts = [];
    const now = new Date();
    
    // ランダムにアラートを生成（実際はビジネスロジックに基づく）
    if (Math.random() < 0.1) { // 10%の確率
      alerts.push({
        id: `alert_${now.getTime()}`,
        type: 'warning' as const,
        message: '売上が予想より20%低下しています。マーケティング施策の見直しを推奨します。',
        timestamp: now,
        severity: 'medium' as const
      });
    }
    
    if (Math.random() < 0.05) { // 5%の確率
      alerts.push({
        id: `alert_${now.getTime()}_2`,
        type: 'info' as const,
        message: '新しい顧客セグメントが検出されました。分析結果を確認してください。',
        timestamp: now,
        severity: 'low' as const
      });
    }
    
    return alerts;
  }

  private simulateConnection(): void {
    // サーバーサイドでの模擬接続
    console.log('🔄 サーバーサイドでリアルタイム機能を初期化');
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`🔄 リアルタイム接続再試行 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ リアルタイム接続に失敗しました。手動で再接続してください。');
      this.emit('connection_failed');
    }
  }
}

// React Hook for Real-Time Data
export function useRealTimeData() {
  const [salesData, setSalesData] = React.useState<SalesUpdate | null>(null);
  const [trafficData, setTrafficData] = React.useState<TrafficUpdate | null>(null);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isMounted) return;

    const service = RealTimeService.getInstance();

    const handleSalesUpdate = (data: SalesUpdate) => setSalesData(data);
    const handleTrafficUpdate = (data: TrafficUpdate) => setTrafficData(data);
    const handleAlert = (alert: any) => setAlerts(prev => [alert, ...prev.slice(0, 9)]);
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    // イベントリスナー登録
    service.on('sales_update', handleSalesUpdate);
    service.on('traffic_update', handleTrafficUpdate);
    service.on('alert', handleAlert);
    service.on('connected', handleConnected);
    service.on('disconnected', handleDisconnected);

    // 接続開始
    service.connect();

    return () => {
      // クリーンアップ
      service.off('sales_update', handleSalesUpdate);
      service.off('traffic_update', handleTrafficUpdate);
      service.off('alert', handleAlert);
      service.off('connected', handleConnected);
      service.off('disconnected', handleDisconnected);
    };
  }, [isMounted]);

  return {
    salesData,
    trafficData,
    alerts,
    isConnected: isMounted ? isConnected : false,
    clearAlerts: () => setAlerts([]),
    isMounted
  };
}

// シングルトンエクスポート
export const realTimeService = RealTimeService.getInstance();

// ユーティリティ関数
export const formatRealtimeValue = (value: number, type: 'currency' | 'number' | 'percentage'): string => {
  switch (type) {
    case 'currency':
      return `¥${value.toLocaleString('ja-JP')}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString('ja-JP');
  }
};

export const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up': return 'text-green-600';
    case 'down': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up': return '↗️';
    case 'down': return '↘️';
    default: return '→';
  }
};