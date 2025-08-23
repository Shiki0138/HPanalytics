import React, { useState } from 'react';
import Head from 'next/head';
import AIInsightBar from '../components/AIInsightBar';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AIChat from '../components/AIChat';
import SalesActionPanel from '../components/SalesActionPanel';
import { SuggestedAction } from '../types';
import { mockAIInsights, mockNavigationItems } from '../data/mockData';

export default function SalesDashboard() {
  const [currentInsight, setCurrentInsight] = useState(mockAIInsights[0]);
  const [insightIndex, setInsightIndex] = useState(0);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);

  const handleDismissInsight = () => {
    const nextIndex = (insightIndex + 1) % mockAIInsights.length;
    setInsightIndex(nextIndex);
    setCurrentInsight(mockAIInsights[nextIndex]);
  };

  const handleActionSuggested = (action: SuggestedAction) => {
    setSuggestedActions(prev => {
      // 重複を避ける
      if (prev.find(a => a.id === action.id)) {
        return prev;
      }
      return [action, ...prev].slice(0, 6); // 最大6件まで
    });
  };

  const handleExecuteAction = (actionId: string) => {
    console.log(`Executing action: ${actionId}`);
    // 実際の実装では API を呼び出してアクションを実行
    alert(`アクション「${actionId}」を実行しました！`);
    
    // 実行済みのアクションを削除
    setSuggestedActions(prev => prev.filter(a => a.id !== actionId));
  };

  const handleViewActionDetails = (actionId: string) => {
    console.log(`Viewing details for action: ${actionId}`);
    alert(`アクション「${actionId}」の詳細を表示します！`);
  };

  const handleNavigate = (itemId: string) => {
    console.log(`Navigating to: ${itemId}`);
    alert(`「${itemId}」ページに移動します！`);
  };

  return (
    <>
      <Head>
        <title>売上最大化ダッシュボード - AI駆動分析システム</title>
        <meta name="description" content="AIアシスタント付き売上最大化分析システム" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* AIインサイトバー */}
        <AIInsightBar 
          insight="💡 売上分析AI: 午後の時間帯でコンバージョン率が15%向上中です。今がプロモーション拡大のチャンスです"
          onDismiss={handleDismissInsight}
        />

        {/* サイドバー */}
        <Sidebar 
          navigationItems={mockNavigationItems}
          onNavigate={handleNavigate}
        />

        {/* ヘッダー */}
        <Header 
          projectName="売上最大化プロジェクト"
          userName="営業分析担当"
          onProjectChange={() => alert('プロジェクト選択メニューを表示')}
          onSearch={(query) => console.log('検索:', query)}
        />

        {/* メインコンテンツ */}
        <main className="ml-64 pt-16 p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* メインレイアウト */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* AIチャットエリア（左側） */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px]">
                  <AIChat 
                    className="h-full"
                    onActionSuggested={handleActionSuggested}
                  />
                </div>
              </div>

              {/* 売上ダッシュボードエリア（右側） */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* リアルタイム売上表示 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    🔥 リアルタイム売上状況
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">今日の売上</div>
                      <div className="text-2xl font-bold text-green-800">¥1,847,520</div>
                      <div className="text-sm text-green-600 mt-1">+18.5% (前日比)</div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">今月の売上</div>
                      <div className="text-2xl font-bold text-blue-800">¥42,350,000</div>
                      <div className="text-sm text-blue-600 mt-1">+12.3% (前月比)</div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">予測達成率</div>
                      <div className="text-2xl font-bold text-purple-800">108%</div>
                      <div className="text-sm text-purple-600 mt-1">目標を8%上回り</div>
                    </div>
                  </div>

                  {/* 売上推移グラフエリア */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">24時間売上推移</h3>
                    <div className="h-48 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📈</div>
                        <div className="text-gray-600">リアルタイムチャート</div>
                        <div className="text-sm text-gray-500">WebSocket連携実装予定</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI異常検知アラート */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">🚨</div>
                    <div>
                      <h3 className="font-semibold text-amber-800">AI異常検知アラート</h3>
                      <p className="text-sm text-amber-700">
                        15:30頃から「プレミアムプラン」の注文が急増しています（通常比+340%）
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        推定原因: 競合他社のサービス障害、SNSでのバイラル効果
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* AIアクション提案パネル */}
            <div className="mb-8">
              <SalesActionPanel 
                actions={suggestedActions}
                onExecuteAction={handleExecuteAction}
                onViewDetails={handleViewActionDetails}
              />
            </div>

            {/* 追加の分析セクション */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 商品パフォーマンス */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 トップ商品</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">プレミアムプラン</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">¥850,000</div>
                      <div className="text-sm text-green-600">+25%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">スタンダードプラン</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">¥620,000</div>
                      <div className="text-sm text-green-600">+18%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">ベーシックプラン</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">¥280,000</div>
                      <div className="text-sm text-blue-600">+5%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 顧客セグメント */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 顧客セグメント</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">新規顧客</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">1,234人</div>
                      <div className="text-sm text-green-600">+32%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">リピート顧客</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">856人</div>
                      <div className="text-sm text-green-600">+15%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">VIP顧客</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">97人</div>
                      <div className="text-sm text-blue-600">+8%</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </main>

        {/* モバイル用フローティングAIボタン */}
        <div className="md:hidden fixed bottom-4 right-4">
          <button className="w-14 h-14 bg-primary-500 rounded-full shadow-lg flex items-center justify-center text-white">
            <div className="text-2xl">🤖</div>
          </button>
        </div>

      </div>
    </>
  );
}