import { useState, useEffect } from 'react';

export const useViewport = () => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleWindowResize = () => setWidth(window.innerWidth);
    
    // Set initial width
    if (typeof window !== 'undefined') {
      setWidth(window.innerWidth);
      window.addEventListener("resize", handleWindowResize);
    }
    
    // Cleanup listener on component unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener("resize", handleWindowResize);
      }
    };
  }, []);

  return { width };
};