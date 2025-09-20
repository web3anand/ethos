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

  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'white':
        return 'bg-white';
      case 'gray':
        return 'bg-gray-400';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      <div 
        className={`${getSizeClasses()} ${getColorClasses()} rounded-sm`}
        style={{
          animation: 'loadingBar 0.6s ease-in-out infinite',
          animationDelay: '0ms'
        }}
      ></div>
      <div 
        className={`${getSizeClasses()} ${getColorClasses()} rounded-sm`}
        style={{
          animation: 'loadingBar 0.6s ease-in-out infinite',
          animationDelay: '0.2s'
        }}
      ></div>
      <div 
        className={`${getSizeClasses()} ${getColorClasses()} rounded-sm`}
        style={{
          animation: 'loadingBar 0.6s ease-in-out infinite',
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
      `}</style>
    </div>
  );
};

export default LoadingBars;
