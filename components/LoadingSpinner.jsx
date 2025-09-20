import React from 'react';

const LoadingSpinner = ({ 
  size = 'sm', 
  color = 'blue', 
  className = '',
  text = null 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    purple: 'border-purple-500',
    gray: 'border-gray-500'
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-2 border-transparent ${colorClasses[color]} border-t-current rounded-full animate-spin`}
      ></div>
      {text && (
        <span className="ml-2 text-sm text-gray-400">{text}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
