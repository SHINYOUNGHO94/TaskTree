import React from 'react';

interface EmptyTaskStateProps {
  onCreateClick: () => void;
}

// タスクが空の場合の表示
export const EmptyTaskState: React.FC<EmptyTaskStateProps> = ({ onCreateClick }) => {
  return (
    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg bg-white">
      <p className="text-gray-500 mb-6 font-medium">No tasks found. Get started by creating your first task.</p>
      <button 
        className="px-6 py-2 bg-gray-900 text-white rounded-md text-sm font-bold hover:bg-gray-800 transition-colors"
        onClick={onCreateClick}
      >
        + Create First Task
      </button>
    </div>
  );
};
