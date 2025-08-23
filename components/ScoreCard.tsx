import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScoreData } from '../data/mockData';

interface ScoreCardProps {
  title: string;
  icon: string;
  data: ScoreData;
  onViewDetails?: () => void;
  onViewSuggestions?: () => void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ 
  title, 
  icon, 
  data, 
  onViewDetails, 
  onViewSuggestions 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'score-excellent';
    if (score >= 75) return 'score-good';
    if (score >= 50) return 'score-warning';
    return 'score-poor';
  };

  const getTrendIcon = () => {
    switch (data.trend) {
      case 'up':
        return <TrendingUp size={16} className="text-success-500" />;
      case 'down':
        return <TrendingDown size={16} className="text-danger-500" />;
      default:
        return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getTrendText = () => {
    if (data.change === 0) return '変化なし';
    const direction = data.change > 0 ? '+' : '';
    return `${direction}${data.change} (先週比)`;
  };

  const getTrendColor = () => {
    if (data.change > 0) return 'text-success-600';
    if (data.change < 0) return 'text-danger-600';
    return 'text-gray-600';
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
      </div>
      
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-2xl font-bold border ${getScoreColor(data.current)}`}>
          {data.current}/100
        </div>
        <div className={`flex items-center space-x-1 mt-2 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{getTrendText()}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <button 
          onClick={onViewDetails}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
        >
          詳細を見る
        </button>
        <button 
          onClick={onViewSuggestions}
          className="flex-1 px-3 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
        >
          改善案
        </button>
      </div>
    </div>
  );
};

export default ScoreCard;