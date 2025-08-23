import React, { useState } from 'react';
import Head from 'next/head';
import AIInsightBar from '../components/AIInsightBar';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ScoreCard from '../components/ScoreCard';
import TaskList from '../components/TaskList';
import PerformanceTracker from '../components/PerformanceTracker';
import { 
  mockScoreData, 
  mockTasks, 
  mockPerformanceData, 
  mockAIInsights, 
  mockNavigationItems 
} from '../data/mockData';

export default function Dashboard() {
  const [currentInsight, setCurrentInsight] = useState(mockAIInsights[0]);
  const [insightIndex, setInsightIndex] = useState(0);

  const handleDismissInsight = () => {
    const nextIndex = (insightIndex + 1) % mockAIInsights.length;
    setInsightIndex(nextIndex);
    setCurrentInsight(mockAIInsights[nextIndex]);
  };

  const handleStartTask = (taskId: string) => {
    alert(`タスク「${taskId}」を開始します！`);
  };

  const handleShowGuide = (taskId: string) => {
    alert(`タスク「${taskId}」のガイドを表示します！`);
  };

  const handleViewDetails = () => {
    alert('詳細分析ページに移動します！');
  };

  const handleViewSuggestions = () => {
    alert('改善提案ページに移動します！');
  };

  const handleNavigate = (itemId: string) => {
    alert(`「${itemId}」ページに移動します！`);
  };

  return (
    <>
      <Head>
        <title>HP分析システム - ダッシュボード</title>
        <meta name="description" content="史上最高の使いやすさを追求したHP分析システム" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* AIインサイトバー */}
        <AIInsightBar 
          insight={currentInsight}
          onDismiss={handleDismissInsight}
        />

        {/* サイドバー */}
        <Sidebar 
          navigationItems={mockNavigationItems}
          onNavigate={handleNavigate}
        />

        {/* ヘッダー */}
        <Header 
          projectName="マイHP分析プロジェクト"
          userName="田中太郎"
          onProjectChange={() => alert('プロジェクト選択メニューを表示')}
          onSearch={(query) => console.log('検索:', query)}
        />

        {/* メインコンテンツ */}
        <main className="ml-64 pt-16 p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* スマートサマリーカード */}
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ScoreCard
                  title="健康度スコア"
                  icon="📈"
                  data={mockScoreData.health}
                  onViewDetails={handleViewDetails}
                  onViewSuggestions={handleViewSuggestions}
                />
                <ScoreCard
                  title="速度スコア"
                  icon="🚀"
                  data={mockScoreData.speed}
                  onViewDetails={handleViewDetails}
                  onViewSuggestions={handleViewSuggestions}
                />
                <ScoreCard
                  title="SEO効果度"
                  icon="🎯"
                  data={mockScoreData.seo}
                  onViewDetails={handleViewDetails}
                  onViewSuggestions={handleViewSuggestions}
                />
              </div>
            </div>

            {/* 改善タスクリスト */}
            <div className="mb-8">
              <TaskList 
                tasks={mockTasks}
                onStartTask={handleStartTask}
                onShowGuide={handleShowGuide}
              />
            </div>

            {/* パフォーマンストラッカー */}
            <div className="mb-8">
              <PerformanceTracker data={mockPerformanceData} />
            </div>

          </div>
        </main>

        {/* モバイル用フッター（768px未満で表示） */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex justify-around">
            <button className="flex flex-col items-center space-y-1 text-primary-600">
              <span className="text-lg">🏠</span>
              <span className="text-xs">ホーム</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-500">
              <span className="text-lg">🔍</span>
              <span className="text-xs">分析</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-500">
              <span className="text-lg">📊</span>
              <span className="text-xs">レポート</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-500">
              <span className="text-lg">⚙</span>
              <span className="text-xs">設定</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}