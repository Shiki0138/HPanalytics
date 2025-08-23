// モックデータ定義
export interface ScoreData {
  current: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  timeRequired: string;
  priority: 'urgent' | 'high' | 'medium';
  category: string;
}

export interface PerformanceData {
  date: string;
  score: number;
}

export const mockScoreData = {
  health: { current: 92, change: 5, trend: 'up' as const },
  speed: { current: 76, change: -8, trend: 'down' as const },
  seo: { current: 88, change: 0, trend: 'neutral' as const },
};

export const mockTasks: TaskItem[] = [
  {
    id: '1',
    title: '画像4枚のalt属性追加',
    description: 'SEO向上のため、メインページの画像にalt属性を追加',
    impact: 'SEO+15点期待',
    timeRequired: '5分で完了',
    priority: 'urgent',
    category: 'SEO最適化'
  },
  {
    id: '2', 
    title: 'メタディスクリプション最適化',
    description: '検索結果での表示を改善し、クリック率を向上',
    impact: '流入+20%期待',
    timeRequired: '15分で完了',
    priority: 'high',
    category: 'SEO最適化'
  },
  {
    id: '3',
    title: '読み込み速度改善（3項目）',
    description: '画像圧縮、キャッシュ設定、コード最適化',
    impact: '離脱率-15%期待',
    timeRequired: '30分で完了',
    priority: 'high',
    category: 'パフォーマンス'
  },
  {
    id: '4',
    title: 'コンテンツ追加（5記事提案）',
    description: 'ユーザーニーズに合った記事コンテンツの作成',
    impact: '新規流入+30%期待',
    timeRequired: '2週間で完了',
    priority: 'medium',
    category: 'コンテンツ'
  }
];

export const mockPerformanceData: PerformanceData[] = [
  { date: '1/1', score: 45 },
  { date: '1/7', score: 52 },
  { date: '1/14', score: 58 },
  { date: '1/21', score: 65 },
  { date: '1/28', score: 72 },
  { date: '今日', score: 88 },
];

export const mockAIInsights = [
  "画像の読み込み最適化で順位が15位上がる可能性があります",
  "競合サイトより読み込み速度が遅いです。改善することで離脱率を20%削減できます",
  "メタディスクリプションを最適化すると、クリック率が25%向上する見込みです",
  "新しいキーワード「HP制作 料金」で上位表示のチャンスがあります"
];

export const mockNavigationItems = [
  { id: 'dashboard', icon: '🏠', label: 'ダッシュボード', active: true, alerts: 0 },
  { id: 'speed', icon: '🔍', label: 'スピード診断', active: false, alerts: 2 },
  { id: 'seo', icon: '📝', label: 'SEO分析', active: false, alerts: 5 },
  { id: 'keywords', icon: '📊', label: 'キーワード追跡', active: false, alerts: 0 },
  { id: 'content', icon: '🎯', label: 'コンテンツ分析', active: false, alerts: 0 },
  { id: 'competitor', icon: '🆚', label: '競合比較', active: false, alerts: 0 },
  { id: 'reports', icon: '📈', label: '成長レポート', active: false, alerts: 0 },
];