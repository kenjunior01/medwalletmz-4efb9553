/**
 * LottieAnimation — Reusable Lottie wrapper
 * Uses the Lottie component from lottie-react for rendering.
 * Includes health-themed presets from LottieFiles CDN.
 */

import Lottie from 'lottie-react';

// Free health-related Lottie animation URLs
const PRESETS: Record<string, { url: string; loop: boolean }> = {
  health:     { url: 'https://assets2.lottiefiles.com/packages/lf20_syqnfe7c.json', loop: true },
  heartbeat:  { url: 'https://assets5.lottiefiles.com/packages/lf20_jR229r.json', loop: true },
  success:    { url: 'https://assets9.lottiefiles.com/packages/lf20_lk80fpsm.json', loop: false },
  notification:{ url: 'https://assets3.lottiefiles.com/packages/lf20_kdnlxhpj.json', loop: true },
  empty:      { url: 'https://assets4.lottiefiles.com/packages/lf20_tutvdkg0.json', loop: true },
  loading:    { url: 'https://assets9.lottiefiles.com/packages/lf20_jcikwtux.json', loop: true },
  medical:    { url: 'https://assets10.lottiefiles.com/packages/lf20_m0yvmujx.json', loop: true },
  wellness:   { url: 'https://assets9.lottiefiles.com/packages/lf20_poqlmycl.json', loop: true },
};

export type LottiePreset = keyof typeof PRESETS;

interface LottieAnimationProps {
  src?: LottiePreset | string;
  animationData?: object;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LottieAnimation({
  src = 'health',
  animationData,
  width = 200,
  height = 200,
  loop: loopProp,
  autoplay = true,
  className = '',
  style,
}: LottieAnimationProps) {
  let resolvedLoop = loopProp;
  let resolvedSrc: string | undefined;

  if (typeof src === 'string' && src in PRESETS) {
    const preset = PRESETS[src as LottiePreset];
    resolvedSrc = preset.url;
    if (loopProp === undefined) resolvedLoop = preset.loop;
  } else if (typeof src === 'string' && src.startsWith('http')) {
    resolvedSrc = src;
  }

  if (!animationData && !resolvedSrc) return null;

  return (
    <div className={className} style={{ width, height, ...style }}>
      <Lottie
        animationData={animationData}
        path={animationData ? undefined : resolvedSrc}
        loop={resolvedLoop ?? true}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  preset?: LottiePreset;
  width?: number;
  height?: number;
  className?: string;
}

export function LottieEmptyState({
  title = 'Sem dados',
  description = 'Ainda não há nada aqui',
  preset = 'empty',
  width = 180,
  height = 180,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <LottieAnimation src={preset} width={width} height={height} />
      <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground text-center max-w-xs">{description}</p>
    </div>
  );
}

interface LoadingOverlayProps {
  preset?: LottiePreset;
  message?: string;
  fullScreen?: boolean;
}

export function LottieLoading({
  preset = 'medical',
  message,
  fullScreen = false,
}: LoadingOverlayProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? 'min-h-screen bg-background' : 'py-12'}`}>
      <LottieAnimation src={preset} width={120} height={120} />
      {message && <p className="text-sm font-medium text-muted-foreground">{message}</p>}
    </div>
  );
}
