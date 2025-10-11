import React from 'react';

const LoadingBars = ({ size = 'medium', className = '', color = 'blue' }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-2 h-4';
      case 'large':
        return 'w-3 h-8';
      default:
        return 'w-2.5 h-6';
    }
  };

  const getColorStyle = () => {
    switch (color) {
      case 'blue':
        return { backgroundColor: 'var(--accent-primary)' };
      case 'white':
        return { backgroundColor: 'var(--text-primary)' };
      case 'gray':
        return { backgroundColor: 'var(--text-muted)' };
      default:
        return { backgroundColor: 'var(--accent-primary)' };
    }
  };

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      <div 
        className={`${getSizeClasses()} rounded-sm`}
        style={{
          ...getColorStyle(),
          animation: 'smoothBar 1.2s ease-in-out infinite',
          animationDelay: '0ms'
        }}
      ></div>
      <div 
        className={`${getSizeClasses()} rounded-sm`}
        style={{
          ...getColorStyle(),
          animation: 'smoothBar 1.2s ease-in-out infinite',
          animationDelay: '0.2s'
        }}
      ></div>
      <div 
        className={`${getSizeClasses()} rounded-sm`}
        style={{
          ...getColorStyle(),
          animation: 'smoothBar 1.2s ease-in-out infinite',
          animationDelay: '0.4s'
        }}
      ></div>
      
      <style jsx>{`
        @keyframes loadingBar {
          0%, 40%, 100% {
            transform: scaleY(0.4);
            opacity: 0.5;
          }
          20% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes smoothBar {
          0% { 
            transform: scaleY(0.6);
            opacity: 0.7;
          }
          25% {
            transform: scaleY(1);
            opacity: 1;
          }
          50% {
            transform: scaleY(0.8);
            opacity: 0.9;
          }
          75% {
            transform: scaleY(1.1);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.6);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingBars;
