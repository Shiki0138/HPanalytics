import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { AIMessage, SuggestedAction } from '@/types';
import { aiService } from '@/utils/ai-service';

interface AIChatProps {
  className?: string;
  onActionSuggested?: (action: SuggestedAction) => void;
}

const AIChat: React.FC<AIChatProps> = ({ className = '', onActionSuggested }) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'こんにちは！売上分析AIアシスタントです。売上に関するご質問や分析をお手伝いします。\n\n例：「今日の売上はどう？」「売上予測を見せて」',
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickSuggestions = [
    '今日の売上状況',
    '週間売上比較', 
    '売上予測（30日）',
    '異常検知結果',
    '改善提案'
  ];

  // メッセージ送信
  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // AI レスポンス生成（模擬データ付き）
      const salesData = generateMockSalesData();
      const aiResponse = await aiService.generateResponse(message, salesData);

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.message,
        timestamp: new Date(),
        attachments: aiResponse.charts ? { 
          type: 'chart', 
          data: aiResponse.charts[0] 
        } : undefined
      };

      setMessages(prev => [...prev, aiMessage]);

      // 提案されたアクションがあれば通知
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        aiResponse.actions.forEach(action => {
          onActionSuggested?.(action);
        });
      }

    } catch (error) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '申し訳ございません。エラーが発生しました。しばらくお待ちください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter キーで送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージアイコン取得
  const getMessageIcon = (type: AIMessage['type']) => {
    switch (type) {
      case 'ai': return <Bot className="w-5 h-5 text-blue-500" />;
      case 'user': return <User className="w-5 h-5 text-gray-600" />;
      default: return null;
    }
  };

  // メッセージタイプ別のスタイリング
  const getMessageStyle = (type: AIMessage['type']) => {
    return type === 'user'
      ? 'bg-primary-500 text-white ml-auto'
      : 'bg-white border border-gray-200 mr-auto';
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-primary-500" />
          <h3 className="font-semibold text-gray-800">売上分析AIアシスタント</h3>
          <div className="ml-auto">
            {aiService.isEnabled() ? (
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                オンライン
              </div>
            ) : (
              <div className="flex items-center text-sm text-yellow-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                設定中
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getMessageIcon(message.type)}
            </div>
            
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getMessageStyle(message.type)}`}>
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              
              {/* 添付ファイル（チャート等）の表示 */}
              {message.attachments && (
                <div className="mt-2 p-3 bg-gray-50 rounded border">
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>データ可視化</span>
                  </div>
                  {/* チャートコンポーネントをここに統合 */}
                  <div className="mt-2 h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded flex items-center justify-center">
                    <span className="text-gray-500">📊 チャート表示エリア</span>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {/* ローディング表示 */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <Bot className="w-5 h-5 text-blue-500 mt-1" />
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">分析中...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* クイック提案 */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-gray-600">よく使う質問</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors duration-200 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* 入力エリア */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="売上に関する質問をどうぞ... (例: 今日の売上はどう？)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// 模擬売上データ生成
function generateMockSalesData() {
  const today = new Date();
  const data = [];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      sales: Math.round(80000 + Math.random() * 40000),
      orders: Math.round(50 + Math.random() * 30)
    });
  }
  
  return data.reverse();
}

export default AIChat;