import React from 'react';

const LoadingScreen = ({ 
  progress = null, 
  message = 'Loading...', 
  showProgress = true 
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 z-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Animated Logo/Icon */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">E</span>
              </div>
            </div>
            {/* Rotating ring */}
            <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-transparent border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Loading Message */}
        <h2 className="text-2xl font-bold text-white mb-4 animate-pulse">
          {message}
        </h2>

        {/* Progress Bar */}
        {showProgress && progress && (
          <div className="space-y-4">
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress.percentage || 0, 100)}%` }}
              ></div>
            </div>
            
            {/* Progress Details */}
            <div className="text-sm text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>{progress.stage || 'Processing data...'}</span>
                <span className="text-blue-400 font-medium">
                  {Math.round(progress.percentage || 0)}%
                </span>
              </div>
              
              {progress.current !== undefined && progress.total !== undefined && (
                <div className="text-xs text-gray-400">
                  {progress.current.toLocaleString()} / {progress.total.toLocaleString()} processed
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Dots Animation */}
        <div className="mt-6 flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Additional Info */}
        <p className="text-gray-400 text-sm mt-4">
          Please wait while we load the latest data...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
