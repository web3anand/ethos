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

  const getColorStyle = (color) => {
    const colorMap = {
      blue: 'var(--accent-primary)',
      green: 'var(--accent-success)',
      red: 'var(--accent-error)',
      yellow: 'var(--accent-warning)',
      purple: 'var(--accent-primary)',
      gray: 'var(--text-muted)'
    };
    return { borderTopColor: colorMap[color] || colorMap.blue };
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-2 border-transparent rounded-full animate-spin`}
        style={getColorStyle(color)}
      ></div>
      {text && (
        <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>{text}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
