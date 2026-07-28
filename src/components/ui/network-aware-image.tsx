import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NetworkAwareImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  placeholderClass?: string;
  lowQualitySrc?: string;
}

/**
 * Network-aware image that:
 * - Shows placeholder immediately (no layout shift)
 * - Loads full image based on connection speed
 * - Falls back gracefully on error
 * - Respects DataSaver mode
 */
export function NetworkAwareImage({
  src, alt, className, fallbackSrc, placeholderClass, lowQualitySrc,
}: NetworkAwareImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [useLowQuality, setUseLowQuality] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Check connection speed
    const conn = (navigator as any).connection;
    if (conn) {
      const isSlow = conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.saveData;
      if (isSlow && lowQualitySrc) {
        setUseLowQuality(true);
      }
    }
  }, [lowQualitySrc]);

  const finalSrc = error && fallbackSrc ? fallbackSrc 
    : useLowQuality && lowQualitySrc ? lowQualitySrc 
    : src;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && (
        <div className={cn("absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse", placeholderClass)} />
      )}
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        className={cn("transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
