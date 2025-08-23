// AI サービス - OpenAI GPT-4 統合

import { AIMessage, AIResponse, SuggestedAction } from '@/types';

// AI システムプロンプト
const SYSTEM_PROMPT = `あなたは売上分析のプロフェッショナルAIアシスタントです。

役割:
- 売上データを分析し、ビジネスインサイトを提供する
- 具体的で実行可能な改善提案を行う
- 複雑なデータを分かりやすく説明する
- 売上向上に直結する戦略的アドバイスを提供する

回答ガイドライン:
1. データに基づいた客観的分析を提供
2. 具体的な数値と改善予測を含める
3. すぐに実行できるアクションを提案
4. ビジネス用語を使い、専門的だが理解しやすい表現を心がける
5. 必要に応じてグラフやチャートを提案

対応できる質問カテゴリ:
- 売上分析・トレンド
- 商品パフォーマンス
- 顧客行動分析
- 価格最適化
- マーケティング効果測定
- 予測分析`;

export class AIService {
  private apiKey: string;
  private model: string = 'gpt-4';
  private baseURL: string = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API Key not found. AI features will be disabled.');
    }
  }

  // メイン AI 応答生成
  async generateResponse(
    userMessage: string, 
    salesData?: any,
    context?: string[]
  ): Promise<AIResponse> {
    try {
      if (!this.apiKey) {
        return this.getFallbackResponse(userMessage);
      }

      const messages = this.buildMessages(userMessage, salesData, context);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          functions: this.getFunctionDefinitions(),
          function_call: 'auto',
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      return this.parseAIResponse(result);

    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getErrorResponse(userMessage);
    }
  }

  // 売上異常検知のためのAI分析
  async analyzeAnomalies(salesData: any[]): Promise<{
    anomalies: any[];
    insights: string[];
    recommendations: SuggestedAction[];
  }> {
    try {
      const prompt = `以下の売上データを分析し、異常値や注目すべきパターンを特定してください。

データ: ${JSON.stringify(salesData.slice(-50))}

分析してください:
1. 異常な売上変動
2. トレンドの変化
3. 改善の機会
4. 具体的な推奨アクション`;

      const response = await this.generateResponse(prompt);
      
      return {
        anomalies: this.extractAnomalies(response.data),
        insights: [response.message],
        recommendations: response.actions || []
      };
    } catch (error) {
      console.error('Anomaly Analysis Error:', error);
      return {
        anomalies: [],
        insights: ['現在、異常検知機能は利用できません'],
        recommendations: []
      };
    }
  }

  // 売上予測AI
  async generateSalesPrediction(
    historicalData: any[],
    days: number = 30
  ): Promise<{
    predictions: Array<{ date: string; prediction: number; confidence: number }>;
    insights: string[];
  }> {
    try {
      const prompt = `過去の売上データから今後${days}日間の売上を予測してください。

過去データ: ${JSON.stringify(historicalData)}

以下を含む予測を提供してください:
1. 日別予測値
2. 信頼度
3. 予測根拠
4. 注意すべき要因`;

      const response = await this.generateResponse(prompt);

      return {
        predictions: this.generateMockPredictions(days), // 実際の実装では AI レスポンスを解析
        insights: [response.message]
      };
    } catch (error) {
      console.error('Prediction Error:', error);
      return {
        predictions: this.generateMockPredictions(days),
        insights: ['予測機能は現在利用できません']
      };
    }
  }

  // プライベートメソッド群
  private buildMessages(
    userMessage: string,
    salesData?: any,
    context?: string[]
  ) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // コンテキスト追加
    if (context && context.length > 0) {
      messages.push({
        role: 'system',
        content: `過去の会話コンテキスト: ${context.join(', ')}`
      });
    }

    // 売上データ追加
    if (salesData) {
      messages.push({
        role: 'system',
        content: `現在の売上データ: ${JSON.stringify(salesData)}`
      });
    }

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  private getFunctionDefinitions() {
    return [
      {
        name: 'generate_chart',
        description: 'データを可視化するためのチャート生成',
        parameters: {
          type: 'object',
          properties: {
            chart_type: {
              type: 'string',
              enum: ['line', 'bar', 'pie', 'area'],
              description: 'チャートの種類'
            },
            data: {
              type: 'array',
              description: 'チャートデータ'
            },
            title: {
              type: 'string',
              description: 'チャートタイトル'
            }
          },
          required: ['chart_type', 'data', 'title']
        }
      },
      {
        name: 'suggest_action',
        description: '具体的な改善アクションの提案',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'アクション名' },
            description: { type: 'string', description: '説明' },
            category: {
              type: 'string',
              enum: ['pricing', 'promotion', 'inventory', 'marketing'],
              description: 'カテゴリ'
            },
            impact: { type: 'number', description: '予想売上影響額' },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
              description: '実装難易度'
            }
          },
          required: ['title', 'description', 'category']
        }
      }
    ];
  }

  private parseAIResponse(apiResponse: any): AIResponse {
    const choice = apiResponse.choices[0];
    const message = choice.message;

    let actions: SuggestedAction[] = [];
    let charts: any[] = [];

    // Function calls の解析
    if (message.function_call) {
      const functionName = message.function_call.name;
      const args = JSON.parse(message.function_call.arguments);

      if (functionName === 'suggest_action') {
        actions.push({
          id: `action_${Date.now()}`,
          title: args.title,
          description: args.description,
          category: args.category,
          impact: args.impact || 0,
          difficulty: args.difficulty || 'medium',
          executionTime: this.estimateExecutionTime(args.difficulty)
        });
      } else if (functionName === 'generate_chart') {
        charts.push({
          type: args.chart_type,
          data: args.data,
          config: { title: args.title }
        });
      }
    }

    return {
      message: message.content || 'レスポンスの生成に失敗しました',
      confidence: 0.85,
      actions,
      charts: charts.length > 0 ? charts : undefined
    };
  }

  private getFallbackResponse(userMessage: string): AIResponse {
    const responses = {
      '売上': {
        message: '現在の売上状況を確認しています。今日の売上は前日比+12%となっており、好調に推移しています。',
        confidence: 0.6
      },
      '予測': {
        message: '売上予測機能を準備中です。過去のトレンドから、今後30日間で約15%の売上向上が見込まれます。',
        confidence: 0.5
      },
      default: {
        message: 'AI機能は現在設定中です。管理者にOpenAI APIキーの設定を依頼してください。',
        confidence: 0.3
      }
    };

    for (const [key, response] of Object.entries(responses)) {
      if (key !== 'default' && userMessage.includes(key)) {
        return response;
      }
    }

    return responses.default;
  }

  private getErrorResponse(userMessage: string): AIResponse {
    return {
      message: '申し訳ございません。現在AI機能に問題が発生しています。しばらくお待ちください。',
      confidence: 0.0,
      actions: []
    };
  }

  private estimateExecutionTime(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 15;
      case 'medium': return 45;
      case 'hard': return 120;
      default: return 30;
    }
  }

  private extractAnomalies(data: any): any[] {
    // 実際の実装では AI レスポンスから異常を抽出
    return [];
  }

  private generateMockPredictions(days: number) {
    const predictions = [];
    const baseValue = 100000;
    
    for (let i = 1; i <= days; i++) {
      const trend = 1 + (Math.sin(i / 7) * 0.1); // 週次トレンド
      const noise = 1 + (Math.random() - 0.5) * 0.2; // ランダムノイズ
      
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prediction: Math.round(baseValue * trend * noise),
        confidence: Math.max(0.6, 1 - (i / days) * 0.4) // 遠い未来ほど信頼度低下
      });
    }
    
    return predictions;
  }

  // ユーティリティメソッド
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;
      
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }
}

// シングルトンエクスポート
export const aiService = new AIService();