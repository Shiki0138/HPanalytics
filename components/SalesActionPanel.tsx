import React, { useState } from 'react';
import { Zap, TrendingUp, AlertTriangle, Play, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { SuggestedAction } from '@/types';

interface SalesActionPanelProps {
  actions: SuggestedAction[];
  onExecuteAction?: (actionId: string) => void;
  onViewDetails?: (actionId: string) => void;
}

const SalesActionPanel: React.FC<SalesActionPanelProps> = ({
  actions = [],
  onExecuteAction,
  onViewDetails
}) => {
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());

  // サンプルアクション（AI が利用できない場合）
  const defaultActions: SuggestedAction[] = [
    {
      id: 'price_optimization',
      title: '🎯 動的価格最適化',
      description: '需要予測AIに基づく価格調整で売上15%向上を見込む',
      category: 'pricing',
      impact: 150000,
      difficulty: 'medium',
      executionTime: 30,
      parameters: []
    },
    {
      id: 'abandoned_cart_campaign',
      title: '🛒 カート離脱防止キャンペーン',
      description: 'パーソナライズされた限定オファーで離脱率25%削減',
      category: 'marketing',
      impact: 200000,
      difficulty: 'easy',
      executionTime: 15,
      parameters: []
    },
    {
      id: 'inventory_restock',
      title: '📦 在庫最適化アラート',
      description: '売れ筋商品の自動発注設定で機会損失を防ぐ',
      category: 'inventory',
      impact: 80000,
      difficulty: 'hard',
      executionTime: 60,
      parameters: []
    }
  ];

  const displayActions = actions.length > 0 ? actions : defaultActions;

  // カテゴリ別アイコン取得
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pricing': return <DollarSign className="w-4 h-4" />;
      case 'marketing': return <TrendingUp className="w-4 h-4" />;
      case 'inventory': return <AlertTriangle className="w-4 h-4" />;
      case 'promotion': return <Zap className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  // 難易度別スタイル取得
  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-50 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // 影響額のフォーマット
  const formatImpact = (amount: number): string => {
    if (amount >= 1000000) {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `¥${(amount / 1000).toFixed(0)}K`;
    }
    return `¥${amount.toLocaleString()}`;
  };

  // アクション実行
  const executeAction = async (actionId: string) => {
    setExecutingActions(prev => new Set([...prev, actionId]));
    
    try {
      // 実行シミュレーション（実際の実装では API 呼び出し）
      await new Promise(resolve => setTimeout(resolve, 2000));
      onExecuteAction?.(actionId);
    } finally {
      setExecutingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-primary-500" />
          <span>AIアクション提案</span>
        </h2>
        <div className="text-sm text-gray-500">
          {displayActions.length}件の提案
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayActions.map((action) => {
          const isExecuting = executingActions.has(action.id);
          
          return (
            <div
              key={action.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
            >
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(action.category)}
                  <span className="text-sm font-medium text-gray-600 capitalize">
                    {action.category}
                  </span>
                </div>
                <div className={`px-2 py-1 text-xs rounded-full border ${getDifficultyStyle(action.difficulty)}`}>
                  {action.difficulty}
                </div>
              </div>

              {/* タイトルと説明 */}
              <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {action.description}
              </p>

              {/* メトリクス */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>予想効果</span>
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatImpact(action.impact)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>実行時間</span>
                  </span>
                  <span className="text-gray-700">
                    {action.executionTime}分
                  </span>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex space-x-2">
                <button
                  onClick={() => executeAction(action.id)}
                  disabled={isExecuting}
                  className="flex-1 flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium py-2 px-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isExecuting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>実行中</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>実行</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => onViewDetails?.(action.id)}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  詳細
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 空状態 */}
      {displayActions.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            提案はありません
          </h3>
          <p className="text-gray-400">
            AIが新しいアクション提案を分析中です
          </p>
        </div>
      )}

      {/* 実行済みアクション通知 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            最近の成功事例
          </span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          「商品ページ最適化」実施により、CVRが3.2%→4.8%に向上（+50%）
        </p>
      </div>
    </div>
  );
};

export default SalesActionPanel;