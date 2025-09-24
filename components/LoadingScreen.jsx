import React from 'react';

const LoadingScreen = ({ 
  progress = null, 
  message = 'Loading...', 
  showProgress = true 
}) => {
  return (
    <div style={{ 
      position: 'fixed', 
      inset: '0', 
      background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary), var(--bg-tertiary))', 
      zIndex: '50', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div className="text-center max-w-md mx-auto px-6">
        {/* Animated Logo/Icon */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
              <div style={{ 
                width: '4rem', 
                height: '4rem', 
                backgroundColor: 'var(--text-primary)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <span style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: 'var(--text-inverse)' 
                }}>E</span>
              </div>
            </div>
            {/* Rotating ring */}
            <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-primary)' }}></div>
          </div>
        </div>

        {/* Loading Message */}
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)', 
          marginBottom: '1rem' 
        }} className="animate-pulse">
          {message}
        </h2>

        {/* Progress Bar */}
        {showProgress && progress && (
          <div className="space-y-4">
            <div className="w-full rounded-full h-3 overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress.percentage || 0, 100)}%` }}
              ></div>
            </div>
            
            {/* Progress Details */}
            <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between">
                <span>{progress.stage || 'Processing data...'}</span>
                <span className="font-medium" style={{ color: 'var(--accent-primary)' }}>
                  {Math.round(progress.percentage || 0)}%
                </span>
              </div>
              
              {progress.current !== undefined && progress.total !== undefined && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {progress.current.toLocaleString()} / {progress.total.toLocaleString()} processed
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Dots Animation */}
        <div className="mt-6 flex justify-center space-x-1">
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent-secondary)', animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent-primary)', animationDelay: '0.2s' }}></div>
        </div>

        {/* Additional Info */}
        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Please wait while we load the latest data...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
