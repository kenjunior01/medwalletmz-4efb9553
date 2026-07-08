import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const useCapacitor = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Configurar StatusBar
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#047857' }); // Cor primária do MedWallet

      // Esconder SplashScreen após inicialização
      SplashScreen.hide();
    }
  }, []);

  const isNative = Capacitor.isNativePlatform();

  return { isNative };
};
