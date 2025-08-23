import React from 'react';
import { Lightbulb, X } from 'lucide-react';

interface AIInsightBarProps {
  insight: string;
  onDismiss?: () => void;
}

const AIInsightBar: React.FC<AIInsightBarProps> = ({ insight, onDismiss }) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white bg-opacity-20 rounded-full p-1">
            <Lightbulb size={16} className="animate-pulse-soft" />
          </div>
          <span className="text-sm font-medium">✨ AI診断</span>
          <span className="text-sm opacity-90">{insight}</span>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-white hover:text-gray-200 transition-colors p-1"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AIInsightBar;