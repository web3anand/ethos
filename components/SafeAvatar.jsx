// SafeAvatar component with fallback for broken images
import { useState, useEffect } from 'react';

const SafeAvatar = ({ 
  src, 
  username, 
  className = '', 
  size = 64,
  alt = 'User avatar'
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Generate fallback avatar URL
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=6366f1&color=fff&size=${size}`;
  
  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setLoading(true);
  }, [src]);
  
  const handleImageError = () => {
    setImageError(true);
    setLoading(false);
  };
  
  const handleImageLoad = () => {
    setImageError(false);
    setLoading(false);
  };
  
  // If no src provided, go straight to fallback
  if (!src || src.trim() === '') {
    return (
      <img
        src={fallbackUrl}
        alt={alt}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover'
        }}
      />
    );
  }
  
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {!imageError && (
        <img
          src={src}
          alt={alt}
          className={className}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
        />
      )}
      {imageError && (
        <img
          src={fallbackUrl}
          alt={alt}
          className={className}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
      )}
    </div>
  );
};

export default SafeAvatar;
