import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DispatchRadar({ onCancel, type = 'médico' }: any) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        {/* Radar Animation */}
        <motion.div
          animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.3, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
          className="absolute inset-0 bg-primary/20 rounded-full"
        />
        <div className="relative bg-primary text-white p-8 rounded-full shadow-2xl">
          <Shield className="h-12 w-12 animate-pulse" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Procurando {type} próximo{dots}</h2>
      <p className="text-muted-foreground mb-8 max-w-xs">
        Estamos a notificar os profissionais disponíveis em Maputo para atender o seu pedido agora.
      </p>

      <div className="w-full max-w-sm bg-muted/50 p-4 rounded-xl mb-8 flex items-center gap-3">
        <MapPin className="text-primary h-5 w-5" />
        <div className="text-left">
          <p className="text-xs text-muted-foreground uppercase font-bold">Localização de Recolha</p>
          <p className="text-sm font-medium">A sua localização atual (GPS)</p>
        </div>
      </div>

      <Button variant="destructive" size="lg" className="rounded-full px-8" onClick={onCancel}>
        <X className="mr-2 h-4 w-4" /> Cancelar Pedido
      </Button>

      <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Segurança MedWallet: Pagamento apenas após aceitação.
      </div>
    </div>
  );
}
