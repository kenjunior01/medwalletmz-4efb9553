import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Trophy, Users, Wallet, TrendingUp, MapPin, Target, HeartPulse,
  ArrowRight, CheckCircle, Clock, Sparkles,
} from '@/components/icons/lucide-compat';
import { PHASES, MAX_PHASE_SCORE, MAX_QUIZ_SCORE } from '@/lib/managerQuest';

const PERKS = [
  { icon: Wallet, title: 'Split 60/40 da receita', desc: 'Ganha directamente do que a sua região produz — sem tectos.' },
  { icon: Users, title: 'Equipa própria', desc: 'Recruta e lidera promotores, APEs e parceiros locais.' },
  { icon: TrendingUp, title: 'Painel de KPIs', desc: 'Utilizadores activos, consultas, visitas APE e adesão TARV em tempo real.' },
  { icon: HeartPulse, title: 'Impacto real', desc: 'Saúde digital acessível na sua província, na sua língua.' },
];

const PROFILE = [
  'Conhece profundamente a sua província e fala a língua local',
  'Experiência em vendas, saúde comunitária, ONG ou gestão de equipas',
  'Disponibilidade mínima de 20 horas por semana',
  'Integridade absoluta na gestão de valores e parceiros',
];

const REGIONS = ['Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa'];

export default function ManagerCareers() {
  return (
    <main className="min-h-screen">
      <Helmet>
        <title>Vagas: Gestor Regional de Saúde Digital | MedWallet</title>
        <meta name="description" content="Candidate-se a Gestor Regional MedWallet: lidere a saúde digital na sua província, com receita partilhada 60/40, equipa própria e painel de KPIs." />
        <link rel="canonical" href="https://medwalletmz.online/vagas-gestor" />
        <meta property="og:title" content="Vagas: Gestor Regional de Saúde Digital | MedWallet" />
        <meta property="og:description" content="Lidere a operação MedWallet na sua província. Avaliação em 3 fases e resposta rápida." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: 'Gestor Regional de Saúde Digital',
          description: 'Liderança da operação MedWallet numa província de Moçambique: parceiros de saúde, equipa de promotores e crescimento regional.',
          employmentType: 'CONTRACTOR',
          hiringOrganization: { '@type': 'Organization', name: 'MedWallet MZ', sameAs: 'https://medwalletmz.online' },
          jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'MZ' } },
        })}</script>
      </Helmet>

      <section className="relative overflow-hidden px-4 py-16 md:py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <Badge className="mx-auto"><Sparkles className="h-3 w-3 mr-1" /> Recrutamento aberto · 11 províncias</Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Seja o Gestor Regional da saúde digital na sua província
          </h1>
          <p className="text-muted-foreground md:text-lg">
            Moçambique são 11 países dentro de um. Procuramos líderes locais que conhecem as pessoas,
            a cultura e os problemas reais de saúde da sua região — e que ganham do que a sua região produz.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/tornar-se-gestor">Candidatar-me agora <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/minha-candidatura">Ver estado da minha candidatura</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Candidatura em ~10 minutos · confirmação automática no fim
          </p>
        </div>
      </section>

      <section className="px-4 py-12 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> O que ganha</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p) => (
              <Card key={p.title}><CardContent className="p-5 space-y-2">
                <p.icon className="h-6 w-6 text-primary" />
                <h3 className="font-bold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2"><Target className="h-6 w-6 text-primary" /> Perfil que procuramos</h2>
            <ul className="space-y-3">
              {PROFILE.map((p) => (
                <li key={p} className="flex gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" /> Regiões com vaga</h2>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Avaliação em 3 fases</h2>
          <p className="text-sm text-muted-foreground mb-6">Total de {MAX_QUIZ_SCORE} pontos. Tudo é feito dentro da aplicação, sem entrevistas iniciais.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {PHASES.map((p) => (
              <Card key={p.phase} className="border-primary/20"><CardContent className="p-5 space-y-2">
                <Badge variant="outline">Fase {p.phase}</Badge>
                <h3 className="font-bold">{p.title.replace(/^Fase \d+ — /, '')}</h3>
                <p className="text-sm text-muted-foreground">{p.subtitle}</p>
                <p className="text-xs text-primary font-semibold">Máximo {MAX_PHASE_SCORE[p.phase]} pontos</p>
              </CardContent></Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link to="/tornar-se-gestor">Iniciar candidatura <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
