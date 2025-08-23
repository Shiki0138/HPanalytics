// AIインサイト生成エンジン

import { AIInsight, SalesData, SuggestedAction } from '@/types';
import { aiService } from './ai-service';
import { salesDataService } from './sales-data';

export class InsightEngine {
  private static instance: InsightEngine;
  private insights: AIInsight[] = [];
  private lastAnalysisTime: Date | null = null;
  private analysisInterval: number = 300000; // 5分間隔

  static getInstance(): InsightEngine {
    if (!InsightEngine.instance) {
      InsightEngine.instance = new InsightEngine();
    }
    return InsightEngine.instance;
  }

  // メインの洞察生成プロセス
  async generateInsights(forceRefresh: boolean = false): Promise<AIInsight[]> {
    const now = new Date();
    
    // 強制更新でない場合、前回の分析から十分時間が経っていなければキャッシュを返す
    if (!forceRefresh && this.lastAnalysisTime && 
        (now.getTime() - this.lastAnalysisTime.getTime()) < this.analysisInterval) {
      return this.insights;
    }

    try {
      console.log('🧠 AIインサイト生成を開始...');

      // 1. データ収集
      const salesData = await salesDataService.getSalesData('month', true);
      const salesMetrics = await salesDataService.getSalesMetrics('month');
      const anomalies = await salesDataService.detectSalesAnomalies();
      const predictions = await salesDataService.getSalesPrediction(30);

      // 2. 各種分析を並行実行
      const [
        trendInsights,
        anomalyInsights,
        opportunityInsights,
        competitiveInsights,
        predictiveInsights
      ] = await Promise.all([
        this.analyzeTrends(salesData, salesMetrics),
        this.analyzeAnomalies(anomalies),
        this.findOpportunities(salesData),
        this.analyzeCompetitivePosition(),
        this.generatePredictiveInsights(predictions)
      ]);

      // 3. インサイトを統合・優先順位付け
      const allInsights = [
        ...trendInsights,
        ...anomalyInsights,
        ...opportunityInsights,
        ...competitiveInsights,
        ...predictiveInsights
      ];

      // 4. 重要度でソート・重複除去
      this.insights = this.prioritizeInsights(allInsights);
      this.lastAnalysisTime = now;

      console.log(`✅ ${this.insights.length}件のインサイトを生成完了`);
      return this.insights;

    } catch (error) {
      console.error('❌ インサイト生成エラー:', error);
      return this.getEmergencyInsights();
    }
  }

  // トレンド分析
  private async analyzeTrends(salesData: SalesData[], metrics: any): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // 売上成長トレンド分析
    if (metrics.previousPeriodComparison > 10) {
      insights.push({
        id: `trend_growth_${Date.now()}`,
        type: 'opportunity',
        title: '🚀 売上成長加速中',
        description: `売上が前月比${metrics.previousPeriodComparison.toFixed(1)}%増加しています。この勢いを維持するための施策を提案します。`,
        severity: 'medium',
        confidence: 0.9,
        impactEstimate: metrics.totalSales * 0.15, // 15%の追加成長を期待
        actionRequired: true,
        suggestedActions: [
          {
            id: 'scale_marketing',
            title: 'マーケティング予算の拡大',
            description: '好調なキャンペーンの予算を20%増額して成長を加速',
            category: 'marketing',
            impact: metrics.totalSales * 0.2,
            difficulty: 'medium',
            executionTime: 60
          }
        ],
        createdAt: new Date(),
        status: 'active'
      });
    }

    // 売上減少トレンド分析
    if (metrics.previousPeriodComparison < -5) {
      insights.push({
        id: `trend_decline_${Date.now()}`,
        type: 'alert',
        title: '⚠️ 売上減少アラート',
        description: `売上が前月比${Math.abs(metrics.previousPeriodComparison).toFixed(1)}%減少しています。早急な対策が必要です。`,
        severity: 'high',
        confidence: 0.95,
        impactEstimate: Math.abs(metrics.totalSales * (metrics.previousPeriodComparison / 100)),
        actionRequired: true,
        suggestedActions: [
          {
            id: 'emergency_promotion',
            title: '緊急プロモーション実施',
            description: '限定割引キャンペーンで購買意欲を喚起',
            category: 'promotion',
            impact: metrics.totalSales * 0.1,
            difficulty: 'easy',
            executionTime: 30
          }
        ],
        createdAt: new Date(),
        status: 'active'
      });
    }

    return insights;
  }

  // 異常値分析
  private async analyzeAnomalies(anomalies: any[]): Promise<AIInsight[]> {
    return anomalies.map(anomaly => ({
      id: `anomaly_${anomaly.timestamp.getTime()}`,
      type: 'anomaly' as const,
      title: `🔍 ${anomaly.type === 'spike' ? '売上急増' : '売上急減'}を検知`,
      description: anomaly.description + `\n可能な原因: ${anomaly.possibleCauses.join(', ')}`,
      severity: anomaly.severity as 'low' | 'medium' | 'high',
      confidence: 0.8,
      impactEstimate: Math.abs(anomaly.value - anomaly.expectedValue),
      actionRequired: anomaly.severity !== 'low',
      suggestedActions: this.getAnomalyActions(anomaly),
      createdAt: new Date(),
      status: 'active' as const
    }));
  }

  // 機会発見
  private async findOpportunities(salesData: SalesData[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // 商品パフォーマンス分析
    const productAnalysis = await salesDataService.getProductSalesAnalysis();
    
    // 成長商品の機会
    productAnalysis.topProducts.forEach(product => {
      if (product.growth > 20) {
        insights.push({
          id: `opportunity_product_${product.productId}`,
          type: 'opportunity',
          title: `⭐ ${product.productName}の成長機会`,
          description: `${product.productName}の売上が${product.growth}%成長中。在庫確保と追加プロモーションで更なる成長が期待できます。`,
          severity: 'medium',
          confidence: 0.85,
          impactEstimate: product.sales * 0.3,
          actionRequired: true,
          suggestedActions: [
            {
              id: `promote_${product.productId}`,
              title: `${product.productName}の重点プロモーション`,
              description: 'SNS広告と特別キャンペーンで露出を増加',
              category: 'marketing',
              impact: product.sales * 0.25,
              difficulty: 'easy',
              executionTime: 45
            }
          ],
          createdAt: new Date(),
          status: 'active'
        });
      }
    });

    // 時間帯別の機会分析
    const hourlyAnalysis = this.analyzeHourlyPatterns(salesData);
    if (hourlyAnalysis.peakOpportunity) {
      insights.push({
        id: `opportunity_timing_${Date.now()}`,
        type: 'opportunity',
        title: '⏰ 時間帯最適化の機会',
        description: hourlyAnalysis.description,
        severity: 'low',
        confidence: 0.7,
        impactEstimate: hourlyAnalysis.potentialIncrease,
        actionRequired: false,
        suggestedActions: hourlyAnalysis.actions,
        createdAt: new Date(),
        status: 'active'
      });
    }

    return insights;
  }

  // 競合分析（模擬）
  private async analyzeCompetitivePosition(): Promise<AIInsight[]> {
    // 実際の実装では外部データソースから競合データを取得
    return [
      {
        id: `competitive_${Date.now()}`,
        type: 'opportunity',
        title: '🏆 競合優位性の機会',
        description: '競合他社Aがサービス障害中です。この機会に積極的なマーケティングで市場シェアを獲得できます。',
        severity: 'medium',
        confidence: 0.75,
        impactEstimate: 200000,
        actionRequired: true,
        suggestedActions: [
          {
            id: 'competitive_campaign',
            title: '競合対策キャンペーン',
            description: '競合の弱みを突く限定キャンペーンを即座に展開',
            category: 'marketing',
            impact: 300000,
            difficulty: 'medium',
            executionTime: 90
          }
        ],
        createdAt: new Date(),
        status: 'active'
      }
    ];
  }

  // 予測的インサイト
  private async generatePredictiveInsights(predictions: any[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // 将来の売上予測に基づく洞察
    const nextWeekPrediction = predictions.slice(0, 7);
    const averagePrediction = nextWeekPrediction.reduce((sum, p) => sum + p.predictedSales, 0) / 7;
    
    if (averagePrediction > 150000) { // 閾値以上の場合
      insights.push({
        id: `prediction_positive_${Date.now()}`,
        type: 'prediction',
        title: '📈 来週の売上増加予測',
        description: `AIモデルによると、来週の売上は平均${Math.round(averagePrediction).toLocaleString()}円/日と予測されます（現在比+23%）。在庫とスタッフの準備を推奨します。`,
        severity: 'low',
        confidence: 0.8,
        impactEstimate: (averagePrediction - 120000) * 7, // 増加分 × 7日
        actionRequired: true,
        suggestedActions: [
          {
            id: 'prepare_capacity',
            title: '売上増加への準備',
            description: '在庫確保とカスタマーサポート体制の強化',
            category: 'inventory',
            impact: 50000,
            difficulty: 'medium',
            executionTime: 120
          }
        ],
        createdAt: new Date(),
        status: 'active'
      });
    }

    return insights;
  }

  // インサイトの優先順位付け
  private prioritizeInsights(insights: AIInsight[]): AIInsight[] {
    return insights
      .filter(insight => insight.confidence > 0.6) // 信頼度の低いものは除外
      .sort((a, b) => {
        // 1. 重要度（severity）
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;

        // 2. 影響額
        const impactDiff = b.impactEstimate - a.impactEstimate;
        if (Math.abs(impactDiff) > 10000) return impactDiff;

        // 3. 信頼度
        return b.confidence - a.confidence;
      })
      .slice(0, 10); // 上位10件まで
  }

  // 緊急時のフォールバックインサイト
  private getEmergencyInsights(): AIInsight[] {
    return [
      {
        id: 'emergency_insight',
        type: 'alert',
        title: '⚠️ システム分析中',
        description: 'AI分析システムが一時的に利用できません。手動での確認を推奨します。',
        severity: 'medium',
        confidence: 1.0,
        impactEstimate: 0,
        actionRequired: false,
        suggestedActions: [],
        createdAt: new Date(),
        status: 'active'
      }
    ];
  }

  // ユーティリティメソッド
  private getAnomalyActions(anomaly: any): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    if (anomaly.type === 'spike') {
      actions.push({
        id: `spike_action_${Date.now()}`,
        title: '売上急増の原因分析',
        description: 'データを詳細分析して成功要因を特定し、再現可能な施策に発展させる',
        category: 'marketing',
        impact: anomaly.value * 0.5,
        difficulty: 'medium',
        executionTime: 90
      });
    } else if (anomaly.type === 'drop') {
      actions.push({
        id: `drop_action_${Date.now()}`,
        title: '緊急売上回復施策',
        description: 'プロモーション実施とカスタマーサポート強化で売上を回復',
        category: 'promotion',
        impact: Math.abs(anomaly.expectedValue - anomaly.value),
        difficulty: 'easy',
        executionTime: 60
      });
    }

    return actions;
  }

  private analyzeHourlyPatterns(salesData: SalesData[]): {
    peakOpportunity: boolean;
    description: string;
    potentialIncrease: number;
    actions: SuggestedAction[];
  } {
    // 時間帯別売上パターンの分析（簡略化）
    const hourlyTotals = new Array(24).fill(0);
    
    salesData.forEach(sale => {
      const hour = new Date(sale.timestamp).getHours();
      hourlyTotals[hour] += sale.amount;
    });

    const maxHour = hourlyTotals.indexOf(Math.max(...hourlyTotals));
    const minHour = hourlyTotals.indexOf(Math.min(...hourlyTotals));
    
    return {
      peakOpportunity: hourlyTotals[maxHour] > hourlyTotals[minHour] * 2,
      description: `${maxHour}時台が最も売上が高く（${Math.round(hourlyTotals[maxHour]).toLocaleString()}円）、${minHour}時台が最低です。時間帯別マーケティングで効率向上が期待できます。`,
      potentialIncrease: (hourlyTotals[maxHour] - hourlyTotals[minHour]) * 0.3,
      actions: [
        {
          id: 'time_based_marketing',
          title: '時間帯別マーケティング',
          description: 'ピーク時間の前後にターゲット広告を配信',
          category: 'marketing',
          impact: 100000,
          difficulty: 'medium',
          executionTime: 120
        }
      ]
    };
  }

  // 公開メソッド
  getCurrentInsights(): AIInsight[] {
    return this.insights;
  }

  getInsightById(id: string): AIInsight | undefined {
    return this.insights.find(insight => insight.id === id);
  }

  dismissInsight(id: string): void {
    const insight = this.getInsightById(id);
    if (insight) {
      insight.status = 'dismissed';
    }
  }

  markInsightImplemented(id: string): void {
    const insight = this.getInsightById(id);
    if (insight) {
      insight.status = 'implemented';
    }
  }
}

// シングルトンエクスポート
export const insightEngine = InsightEngine.getInstance();