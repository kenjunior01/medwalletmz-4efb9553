import { MessageCircle, X, Send, Phone, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const WHATSAPP_NUMBER = '258840000000'; // Número de suporte do MoçambiApp
const SUPPORT_MESSAGES = [
  { text: 'Preciso de ajuda com um pedido', icon: HelpCircle },
  { text: 'Quero rastrear minha entrega', icon: Phone },
  { text: 'Tenho uma reclamação', icon: MessageCircle },
  { text: 'Falar com um atendente', icon: Send },
];

export function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);

  const openWhatsApp = (message?: string) => {
    const encodedMessage = encodeURIComponent(
      message || 'Olá! Preciso de ajuda com o MoçambiApp.'
    );
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`,
      '_blank'
    );
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6">
      {/* Chat Options Panel */}
      <div
        className={cn(
          'absolute bottom-16 right-0 w-72 transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        <Card className="shadow-xl border-border">
          <CardHeader className="pb-3 bg-green-500 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Suporte WhatsApp
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-green-600"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-green-100 mt-1">
              Disponível 24/7 para ajudar você
            </p>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Como podemos ajudar?
            </p>
            {SUPPORT_MESSAGES.map((item, index) => (
              <button
                key={index}
                onClick={() => openWhatsApp(item.text)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors text-sm"
              >
                <item.icon className="h-4 w-4 text-green-500" />
                <span>{item.text}</span>
              </button>
            ))}
            <Button
              className="w-full mt-3 bg-green-500 hover:bg-green-600"
              onClick={() => openWhatsApp()}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Iniciar Conversa
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110',
          isOpen
            ? 'bg-destructive rotate-0'
            : 'bg-green-500 hover:bg-green-600'
        )}
        aria-label="Suporte WhatsApp"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Pulse animation for attention */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25" />
      )}
    </div>
  );
}
