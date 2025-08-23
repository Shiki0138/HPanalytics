import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// すべてのコンポーネントをSSRなしで読み込み
const AIInsightBar = dynamic(() => import('../components/AIInsightBar'), { ssr: false });
const Header = dynamic(() => import('../components/Header'), { ssr: false });
const Sidebar = dynamic(() => import('../components/Sidebar'), { ssr: false });
const AIChat = dynamic(() => import('../components/AIChat'), { ssr: false });
const SalesActionPanel = dynamic(() => import('../components/SalesActionPanel'), { ssr: false });

export default function SimpleDashboard() {
  return (
    <>
      <Head>
        <title>市場最強売上分析システム</title>
        <meta name="description" content="AIアシスタント付き売上最大化分析システム" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* シンプルなヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-lg">🚀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">市場最強売上分析システム</h1>
                <p className="text-sm opacity-90">AI駆動の売上最大化プラットフォーム</p>
              </div>
            </div>
            <div className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
              ✨ AI分析中...
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <main className="max-w-7xl mx-auto p-6">
          
          {/* リアルタイム売上表示 */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">今日の売上</p>
                    <p className="text-2xl font-bold text-gray-900">¥1,847,520</p>
                    <p className="text-sm text-green-600">+18.5% (前日比)</p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">今月の売上</p>
                    <p className="text-2xl font-bold text-gray-900">¥42,350,000</p>
                    <p className="text-sm text-blue-600">+12.3% (前月比)</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">予測達成率</p>
                    <p className="text-2xl font-bold text-gray-900">108%</p>
                    <p className="text-sm text-purple-600">目標を8%上回り</p>
                  </div>
                  <div className="text-3xl">🎯</div>
                </div>
              </div>
            </div>
          </div>

          {/* AIインサイトと提案 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* AI分析結果 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-2xl">🤖</span>
                <span>AI分析結果</span>
              </h2>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-600">🚀</span>
                    <span className="font-medium text-green-800">売上成長加速中</span>
                  </div>
                  <p className="text-sm text-green-700">
                    売上が前月比18.5%増加しています。この勢いを維持するための施策を提案します。
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-blue-600">⚡</span>
                    <span className="font-medium text-blue-800">最適化機会発見</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    プレミアムプランの売上が特に好調です。マーケティング予算の20%増額を推奨します。
                  </p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-600">⏰</span>
                    <span className="font-medium text-yellow-800">時間帯最適化</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    15時-17時の売上が高いため、この時間帯にターゲット広告を配信することを推奨します。
                  </p>
                </div>
              </div>
            </div>

            {/* 推奨アクション */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-2xl">⚡</span>
                <span>推奨アクション</span>
              </h2>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-800">🎯 動的価格最適化</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">高効果</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    需要予測AIに基づく価格調整で売上15%向上を見込む
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      予想効果: ¥150,000 | 実行時間: 30分
                    </div>
                    <button className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-600 transition-colors">
                      実行
                    </button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-800">🛒 カート離脱防止</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">簡単</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    パーソナライズされた限定オファーで離脱率25%削減
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      予想効果: ¥200,000 | 実行時間: 15分
                    </div>
                    <button className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-600 transition-colors">
                      実行
                    </button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-800">📦 在庫最適化</h3>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">中級</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    売れ筋商品の自動発注設定で機会損失を防ぐ
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      予想効果: ¥80,000 | 実行時間: 60分
                    </div>
                    <button className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-600 transition-colors">
                      実行
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 商品・顧客分析 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-xl">🏆</span>
                <span>トップ商品</span>
              </h3>
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-xl">👥</span>
                <span>顧客セグメント</span>
              </h3>
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

          {/* フッター */}
          <div className="mt-12 text-center text-gray-500">
            <p className="text-sm">🚀 市場最強の売上最大化分析システム</p>
            <p className="text-xs mt-1">AI駆動で売上を科学的に最大化</p>
          </div>

        </main>
      </div>
    </>
  );
}