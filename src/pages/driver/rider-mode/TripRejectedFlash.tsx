import { AnimatePresence, motion } from 'framer-motion';

interface TripRejectedFlashProps {
  show: boolean;
}

export function TripRejectedFlash({ show }: TripRejectedFlashProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="px-6 py-4 rounded-2xl bg-red-500/90 backdrop-blur-md"
          >
            <p className="text-white font-bold text-center">Entrega rejeitada</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
