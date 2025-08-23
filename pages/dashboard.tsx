import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">システムを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>市場最強売上分析システム</title>
        <meta name="description" content="AIアシスタント付き売上最大化分析システム" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* グラデーションヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">市場最強売上分析システム</h1>
                  <p className="text-sm opacity-90 mt-1">AI駆動の売上最大化プラットフォーム</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-xs opacity-75">リアルタイム更新</div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">オンライン</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <main className="max-w-7xl mx-auto p-6">
          
          {/* AIアラートバナー */}
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl animate-bounce">🤖</div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">AI分析完了</h3>
                <p className="text-sm text-amber-700 mt-1">
                  売上が前日比+18.5%で好調推移中。プレミアムプランの需要が急増しています。
                  マーケティング予算の20%増額で更なる成長が期待できます。
                </p>
              </div>
            </div>
          </div>

          {/* KPIダッシュボード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard 
              title="今日の売上"
              value="¥1,847,520"
              change="+18.5%"
              changeType="positive"
              icon="📈"
              subtitle="前日比"
            />
            <KPICard 
              title="今月の売上"
              value="¥42,350,000"
              change="+12.3%"
              changeType="positive"
              icon="💰"
              subtitle="前月比"
            />
            <KPICard 
              title="コンバージョン率"
              value="4.8%"
              change="+0.6pt"
              changeType="positive"
              icon="🎯"
              subtitle="前週比"
            />
            <KPICard 
              title="予測達成率"
              value="108%"
              change="+8%"
              changeType="positive"
              icon="🏆"
              subtitle="目標比"
            />
          </div>

          {/* メインセクション */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* AI分析結果 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
                  <span className="text-2xl">🧠</span>
                  <span>AI分析インサイト</span>
                </h2>
                
                <div className="space-y-4">
                  <AIInsightCard 
                    type="success"
                    title="売上成長加速中"
                    description="売上が前月比18.5%増加しています。特にプレミアムプランが好調で、この勢いを維持するためのマーケティング強化を推奨します。"
                    action="マーケティング予算20%増額"
                    impact="¥500,000"
                  />
                  
                  <AIInsightCard 
                    type="warning"
                    title="在庫不足リスク検知"
                    description="人気商品「プレミアムプラン」の在庫が残り20%を切りました。機会損失を防ぐため緊急補充が必要です。"
                    action="緊急在庫補充"
                    impact="¥200,000"
                  />
                  
                  <AIInsightCard 
                    type="info"
                    title="新規顧客獲得チャンス"
                    description="競合他社のサービス障害により、検索トラフィックが30%増加中。この機会を活用してください。"
                    action="広告予算の一時増額"
                    impact="¥300,000"
                  />
                </div>
              </div>
            </div>

            {/* 推奨アクション */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
                  <span className="text-2xl">⚡</span>
                  <span>今すぐ実行</span>
                </h2>
                
                <div className="space-y-4">
                  <ActionCard 
                    title="価格最適化"
                    description="需要に基づく動的価格調整"
                    impact="¥150,000"
                    time="15分"
                    difficulty="easy"
                  />
                  
                  <ActionCard 
                    title="カート離脱防止"
                    description="限定オファー自動配信"
                    impact="¥200,000"
                    time="10分"
                    difficulty="easy"
                  />
                  
                  <ActionCard 
                    title="SEO最適化"
                    description="検索順位向上施策実施"
                    impact="¥80,000"
                    time="45分"
                    difficulty="medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 詳細分析セクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* トップ商品 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-xl">🏆</span>
                <span>トップパフォーマンス商品</span>
              </h3>
              
              <div className="space-y-4">
                <ProductCard 
                  name="プレミアムプラン"
                  sales="¥850,000"
                  growth="+25%"
                  status="hot"
                />
                <ProductCard 
                  name="スタンダードプラン"
                  sales="¥620,000"
                  growth="+18%"
                  status="good"
                />
                <ProductCard 
                  name="ベーシックプラン"
                  sales="¥280,000"
                  growth="+5%"
                  status="stable"
                />
              </div>
            </div>

            {/* 顧客セグメント */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-xl">👥</span>
                <span>顧客セグメント分析</span>
              </h3>
              
              <div className="space-y-4">
                <CustomerSegment 
                  name="新規顧客"
                  count="1,234人"
                  value="¥15,000"
                  growth="+32%"
                />
                <CustomerSegment 
                  name="リピート顧客"
                  count="856人"
                  value="¥35,000"
                  growth="+15%"
                />
                <CustomerSegment 
                  name="VIP顧客"
                  count="97人"
                  value="¥125,000"
                  growth="+8%"
                />
              </div>
            </div>
          </div>

          {/* システム情報フッター */}
          <div className="mt-12 text-center py-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              🚀 Market-Leading Sales Analytics System
            </p>
            <p className="text-gray-400 text-xs mt-1">
              AI-powered sales maximization platform | Last updated: {new Date().toLocaleString('ja-JP')}
            </p>
          </div>

        </main>
      </div>
    </>
  );
}

// KPIカードコンポーネント
function KPICard({ title, value, change, changeType, icon, subtitle }: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  subtitle: string;
}) {
  const changeColor = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  }[changeType];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${changeColor}`}>
          {change}
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

// AI分析カード
function AIInsightCard({ type, title, description, action, impact }: {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
  impact: string;
}) {
  const typeConfig = {
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '🚀', iconColor: 'text-green-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', iconColor: 'text-amber-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💡', iconColor: 'text-blue-600' }
  }[type];

  return (
    <div className={`${typeConfig.bg} ${typeConfig.border} border rounded-lg p-4`}>
      <div className="flex items-start space-x-3">
        <div className="text-xl">{typeConfig.icon}</div>
        <div className="flex-1">
          <h4 className={`font-semibold mb-2 ${typeConfig.iconColor}`}>{title}</h4>
          <p className="text-sm text-gray-700 mb-3">{description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">推奨: {action}</span>
            <span className="text-xs font-bold text-gray-800">影響額: {impact}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// アクションカード
function ActionCard({ title, description, impact, time, difficulty }: {
  title: string;
  description: string;
  impact: string;
  time: string;
  difficulty: 'easy' | 'medium' | 'hard';
}) {
  const difficultyColor = {
    easy: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    hard: 'text-red-600 bg-red-50'
  }[difficulty];

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium text-gray-800">{title}</h4>
        <span className={`text-xs px-2 py-1 rounded ${difficultyColor}`}>
          {difficulty}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
        <span>効果: {impact}</span>
        <span>時間: {time}</span>
      </div>
      <button className="w-full bg-blue-500 text-white text-sm py-2 rounded hover:bg-blue-600 transition-colors">
        実行
      </button>
    </div>
  );
}

// 商品カード
function ProductCard({ name, sales, growth, status }: {
  name: string;
  sales: string;
  growth: string;
  status: 'hot' | 'good' | 'stable';
}) {
  const statusConfig = {
    hot: { bg: 'bg-red-50', text: 'text-red-600', icon: '🔥' },
    good: { bg: 'bg-green-50', text: 'text-green-600', icon: '📈' },
    stable: { bg: 'bg-blue-50', text: 'text-blue-600', icon: '📊' }
  }[status];

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full ${statusConfig.bg} flex items-center justify-center`}>
          <span className="text-sm">{statusConfig.icon}</span>
        </div>
        <span className="font-medium text-gray-800">{name}</span>
      </div>
      <div className="text-right">
        <div className="font-bold text-gray-900">{sales}</div>
        <div className={`text-sm ${statusConfig.text}`}>{growth}</div>
      </div>
    </div>
  );
}

// 顧客セグメントカード
function CustomerSegment({ name, count, value, growth }: {
  name: string;
  count: string;
  value: string;
  growth: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <div className="font-medium text-gray-800">{name}</div>
        <div className="text-sm text-gray-600">{count}</div>
      </div>
      <div className="text-right">
        <div className="font-bold text-gray-900">{value}</div>
        <div className="text-sm text-green-600">{growth}</div>
      </div>
    </div>
  );
}