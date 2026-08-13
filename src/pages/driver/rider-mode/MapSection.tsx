import { motion } from 'framer-motion';
import { MapPin, Signal, Radio } from '@/components/icons/lucide-compat';
import { MapGridPattern } from './MapGridPattern';

interface MapSectionProps {
  isOnline: boolean;
}

export function MapSection({ isOnline }: MapSectionProps) {
  return (
    <section
      className={`relative flex-shrink-0 ${
        isOnline ? 'h-[42vh]' : 'h-[38vh]'
      } transition-all duration-500`}
      aria-label="Mapa"
    >
      {/* Dark map background */}
      <div
        className={`absolute inset-0 ${
          isOnline
            ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900'
            : 'bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-200'
        }`}
      >
        <MapGridPattern online={isOnline} />

        {/* Province/city overlay */}
        <div
          className={`absolute top-3 left-4 flex items-center gap-1.5 text-xs font-medium ${
            isOnline ? 'text-white/60' : 'text-zinc-500'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Maputo, Mocambique</span>
        </div>

        {/* Online signal indicator */}
        {isOnline && (
          <div className="absolute top-3 right-4 flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        )}

        {/* Center pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isOnline ? (
            <>
              {/* Outer pulse ring 1 */}
              <motion.div
                className="absolute w-40 h-40 rounded-full border-2 border-emerald-500/30"
                animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Outer pulse ring 2 */}
              <motion.div
                className="absolute w-28 h-28 rounded-full border border-emerald-500/40"
                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              />
              {/* Inner glow ring */}
              <motion.div
                className="absolute w-16 h-16 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.15, 0.4] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              {/* Core dot */}
              <div className="relative w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            </>
          ) : (
            <div className="relative flex flex-col items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-zinc-400/60" />
            </div>
          )}
        </div>

        {/* Status text overlay */}
        <div className="absolute bottom-6 inset-x-0 flex flex-col items-center">
          {isOnline ? (
            <motion.div
              className="flex items-center gap-2 text-emerald-400 font-medium text-sm"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Procurando entregas...</span>
            </motion.div>
          ) : (
            <span className="text-zinc-400 text-sm font-medium">Offline</span>
          )}
        </div>
      </div>
    </section>
  );
}
