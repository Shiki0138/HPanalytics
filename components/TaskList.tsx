import React from 'react';
import { Clock, Target, AlertCircle, Zap, Calendar } from 'lucide-react';
import { TaskItem } from '../data/mockData';

interface TaskListProps {
  tasks: TaskItem[];
  onStartTask?: (taskId: string) => void;
  onShowGuide?: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onStartTask, onShowGuide }) => {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: <AlertCircle size={16} className="text-red-500" />,
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          label: '緊急（24時間以内）'
        };
      case 'high':
        return {
          icon: <Zap size={16} className="text-orange-500" />,
          bgColor: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-800',
          label: '高効果（1週間以内）'
        };
      default:
        return {
          icon: <Calendar size={16} className="text-blue-500" />,
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          label: '中長期（1ヶ月以内）'
        };
    }
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.priority]) {
      acc[task.priority] = [];
    }
    acc[task.priority].push(task);
    return acc;
  }, {} as Record<string, TaskItem[]>);

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-6">
        <Target className="text-primary-500" size={20} />
        <h2 className="text-xl font-semibold text-gray-800">今すぐできる改善（効果が高く、実装が簡単）</h2>
      </div>

      <div className="space-y-6">
        {['urgent', 'high', 'medium'].map((priority) => {
          const tasksInPriority = groupedTasks[priority] || [];
          if (tasksInPriority.length === 0) return null;
          
          const config = getPriorityConfig(priority);
          
          return (
            <div key={priority} className={`${config.bgColor} border rounded-lg p-4`}>
              <div className="flex items-center space-x-2 mb-3">
                {config.icon}
                <h3 className={`font-medium ${config.textColor}`}>{config.label}</h3>
              </div>
              
              <div className="space-y-3">
                {tasksInPriority.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-1">{task.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Target size={12} className="text-green-500" />
                            <span>{task.impact}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock size={12} className="text-blue-500" />
                            <span>{task.timeRequired}</span>
                          </span>
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {task.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <button 
                        onClick={() => onStartTask?.(task.id)}
                        className="btn-primary text-sm px-3 py-1.5"
                      >
                        今すぐ実行
                      </button>
                      <button 
                        onClick={() => onShowGuide?.(task.id)}
                        className="btn-secondary text-sm px-3 py-1.5"
                      >
                        やり方表示
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskList;