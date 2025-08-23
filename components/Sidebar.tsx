import React from 'react';
import { Settings, BookOpen, Star } from 'lucide-react';

interface NavigationItem {
  id: string;
  icon: string;
  label: string;
  active: boolean;
  alerts: number;
}

interface SidebarProps {
  navigationItems: NavigationItem[];
  onNavigate?: (itemId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navigationItems, onNavigate }) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
            HP
          </div>
          <span className="font-bold text-gray-800">分析システム</span>
        </div>

        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                item.active 
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              {item.alerts > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                  {item.alerts}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="space-y-2">
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-800 rounded-lg transition-colors duration-200">
              <Star size={18} className="text-yellow-500" />
              <span className="font-medium">おすすめ改善</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-800 rounded-lg transition-colors duration-200">
              <BookOpen size={18} />
              <span className="font-medium">学習コンテンツ</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-800 rounded-lg transition-colors duration-200">
              <Settings size={18} />
              <span className="font-medium">設定・連携</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;