import { motion } from 'framer-motion';
import { Power } from '@/components/icons/lucide-compat';

interface OnlineToggleProps {
  isOnline: boolean;
  toggling: boolean;
  onToggle: () => void;
}

export function OnlineToggle({ isOnline, toggling, onToggle }: OnlineToggleProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
      <div
        className="flex justify-center pb-6 pt-4 pointer-events-auto"
        style={{
          background: isOnline
            ? 'linear-gradient(to top, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.7) 60%, transparent 100%)'
            : 'linear-gradient(to top, var(--background) 0%, var(--background) 60%, transparent 100%)',
        }}
      >
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`relative flex flex-col items-center justify-center transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isOnline ? 'w-[88px] h-[88px] rounded-full' : 'w-20 h-20 rounded-full'
          } ${toggling ? 'opacity-70 pointer-events-none' : ''}`}
          style={{
            backgroundColor: isOnline ? '#10b981' : '#3f3f46',
            boxShadow: isOnline
              ? '0 0 0 0 rgba(16,185,129,0.4), 0 0 30px rgba(16,185,129,0.3)'
              : 'none',
          }}
          aria-label={isOnline ? 'Ficar offline' : 'Ficar online'}
        >
          {/* Pulsing glow rings when online */}
          {isOnline && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-emerald-300/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
              />
            </>
          )}

          {/* Animated glow box-shadow when online */}
          {isOnline && (
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(16,185,129,0.4)',
                  '0 0 0 16px rgba(16,185,129,0)',
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          )}

          <Power
            className={`w-7 h-7 transition-colors duration-300 ${
              isOnline ? 'text-white' : 'text-white/80'
            }`}
          />
          <span
            className={`text-[10px] font-bold tracking-wide mt-1 transition-colors duration-300 ${
              isOnline ? 'text-white' : 'text-white/70'
            }`}
          >
            {isOnline ? 'ONLINE' : 'FICAR ONLINE'}
          </span>

          {/* Loading spinner while toggling */}
          {toggling && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </button>
      </div>
    </div>
  );
}
