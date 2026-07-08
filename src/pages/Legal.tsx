import { useNavigate } from 'react-router-dom';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Scale, FileText } from 'lucide-react';

export default function Legal() {
  const navigate = useNavigate();
  const { country, t } = useCountry();

  const legalConfig: Record<string, { title: string; content: string; authority: string }> = {
    BR: {
      title: 'Termos & Privacidade (Brasil)',
      authority: 'Em conformidade com a LGPD (Lei 13.709/2018)',
      content: 'Como usuário no Brasil, seus dados de saúde são protegidos pelo sigilo médico e pela LGPD...'
    },
    MZ: {
      title: 'Termos & Privacidade (Moçambique)',
      authority: 'Regulado pelas Leis de Saúde da República de Moçambique',
      content: 'O MedWallet segue as normas do Ministério da Saúde (MISAU) para telemedicina e proteção de dados...'
    },
    DEFAULT: {
      title: 'Global Terms of Service',
      authority: 'International Health Data Standards',
      content: 'By using MedWallet, you agree to our international privacy standards...'
    }
  };

  const config = legalConfig[country?.id || 'DEFAULT'] || legalConfig.DEFAULT;

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b flex items-center gap-3 bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold text-lg">{t('legal.title')}</h1>
      </header>

      <main className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{config.title}</h2>
          <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full font-mono uppercase">
            {config.authority}
          </span>
        </div>

        <section className="bg-card rounded-2xl border p-5 shadow-sm space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>{config.content}</p>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
            <Scale className="h-5 w-5 text-primary shrink-0 mt-1" />
            <p className="text-xs">{t('legal.auto_update_notice')}</p>
          </div>
        </section>

        <div className="grid gap-3">
          <Button variant="outline" className="justify-start gap-3 h-14">
            <FileText className="h-5 w-5" /> {t('legal.cookies_policy')}
          </Button>
          <Button variant="outline" className="justify-start gap-3 h-14">
            <Scale className="h-5 w-5" /> {t('legal.medical_responsibility')}
          </Button>
        </div>
      </main>
    </div>
  );
}
