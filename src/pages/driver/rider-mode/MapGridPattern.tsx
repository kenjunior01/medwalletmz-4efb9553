import { useRef } from 'react';
import { motion } from 'framer-motion';

export function MapGridPattern({ online }: { online: boolean }) {
  const dots = useRef(
    Array.from({ length: 64 }, (_, i) => ({
      id: i,
      x: (i % 8) * 12.5 + 6.25,
      y: Math.floor(i / 8) * 12.5 + 6.25,
      delay: Math.random() * 3,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0%"
            y1={`${(i + 1) * 11.11}%`}
            x2="100%"
            y2={`${(i + 1) * 11.11}%`}
            stroke="white"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={`${(i + 1) * 11.11}%`}
            y1="0%"
            x2={`${(i + 1) * 11.11}%`}
            y2="100%"
            stroke="white"
            strokeWidth="0.5"
          />
        ))}
      </svg>
      {/* Dots */}
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            backgroundColor: online ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.12)',
          }}
          animate={online ? { opacity: [0.2, 0.6, 0.2], scale: [1, 1.3, 1] } : {}}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
