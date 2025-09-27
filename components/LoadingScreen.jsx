import React from 'react';
import IntegratedLoading from './IntegratedLoading';

const LoadingScreen = ({ 
  progress = null, 
  message = 'Loading...', 
  showProgress = true,
  size = 'medium' 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '2rem',
      minHeight: '200px'
    }}>
      <IntegratedLoading 
        progress={progress}
        message={message}
        showProgress={showProgress}
        size={size}
      />
    </div>
  );
};

export default LoadingScreen;
        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Please wait while we load the latest data...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
