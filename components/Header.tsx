import React from 'react';
import { Search, Settings, User, ChevronDown } from 'lucide-react';

interface HeaderProps {
  projectName?: string;
  userName?: string;
  onProjectChange?: () => void;
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  projectName = "マイサイト", 
  userName = "ユーザー",
  onProjectChange,
  onSearch 
}) => {
  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-64 right-0 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-800">{projectName}</span>
            <button 
              onClick={onProjectChange}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="検索"
              className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings size={18} />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
              {userName.charAt(0)}
            </div>
            <span className="text-sm font-medium text-gray-700">{userName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;