import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Shield, Smartphone, Moon, Globe, Trash2 } from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const { country, t } = useCountry();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">{t('profile.menu.settings')}</h1>
      </header>

      <div className="p-4 space-y-6">
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Preferências</h2>
          <Card className="rounded-[1.5rem] border-2">
            <CardContent className="p-0 divide-y">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Notificações Push</Label>
                    <p className="text-[10px] text-muted-foreground">Avisos de consultas e entregas</p>
                  </div>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Modo Escuro</Label>
                    <p className="text-[10px] text-muted-foreground">Adaptar interface para a noite</p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Segurança & Região</h2>
          <Card className="rounded-[1.5rem] border-2">
            <CardContent className="p-0 divide-y">
              <button
                onClick={() => navigate('/addresses')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-secondary" />
                  <div className="space-y-0.5 text-left">
                    <span className="text-sm font-bold block">Região Atual</span>
                    <p className="text-[10px] text-muted-foreground">{country?.name} ({country?.currency_code})</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded">Alterar</span>
              </button>

              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-destructive"
                onClick={() => toast.error("Por favor, contacte o suporte para apagar a conta.")}
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="h-5 w-5" />
                  <div className="space-y-0.5 text-left">
                    <span className="text-sm font-bold block">Eliminar Conta</span>
                    <p className="text-[10px] opacity-70">Apagar todos os teus dados permanentemente</p>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        </section>

        <div className="text-center space-y-2 pt-8">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MedWallet Global</p>
          <p className="text-[9px] text-muted-foreground opacity-60">ID do Dispositivo: {Math.random().toString(36).substring(7).toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
