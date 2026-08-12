import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Pill, MapPin, Heart, Wallet,
  TrendingUp, ShieldCheck, Users, Calendar,
  Truck, Zap, Video,
} from '@/components/icons/lucide-compat';
import { SEOHead } from '@/components/seo';
import AnimatedBackground from '@/components/brand/AnimatedBackground';

/* ────────────────────────────────────────────
   Animated Counter Hook (pure CSS-driven via IntersectionObserver)
   ──────────────────────────────────────────── */
function useCountUp(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const step = Math.ceil(end / (duration / 16));
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= end) { setCount(end); clearInterval(timer); }
            else setCount(current);
          }, 16);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return { count, ref };
}

/* ────────────────────────────────────────────
   Data
   ──────────────────────────────────────────── */
const FEATURES = [
  { icon: Video, title: 'Consultas Online', desc: 'Telemedicina com médicos qualificados em tempo real, direto do seu telemóvel.' },
  { icon: Stethoscope, title: 'Triagem Inteligente', desc: 'IA que avalia seus sintomas e recomenda o melhor caminho para o tratamento.' },
  { icon: Truck, title: 'Farmácia Delivery', desc: 'Medicamentos na sua porta — entrega rápida em todas as províncias.' },
  { icon: Wallet, title: 'Carteira Digital', desc: 'M-Pesa, e-Mola e pagamentos locais integrados num só lugar.' },
  { icon: Heart, title: 'Veterinária', desc: 'Saúde para seus animais — consultas, vacinas e entrega de medicamentos.' },
  { icon: ShieldCheck, title: 'Pronto-Socorro', desc: 'SOS 24h com localização automática — ajuda quando mais precisa.' },
];

const PROVINCES = [
  'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane',
  'Sofala', 'Manica', 'Tete', 'Zambézia',
  'Nampula', 'Cabo Delgado', 'Niassa', 'Mozambique',
];

const TESTIMONIALS = [
  { name: 'Ana Matsinhe', role: 'Estudante, Maputo', quote: 'O MedWallet mudou a forma como cuido da minha saúde. Agora consigo marcar consultas e pedir medicamentos sem sair de casa.' },
  { name: 'João Mondlane', role: 'Motorista, Beira', quote: 'Como motorista, estou sempre em movimento. A carteira digital e o SOS 24h dão-me tranquilidade em qualquer parte.' },
  { name: 'Fátima Assane', role: 'Farmacêutica, Nampula', quote: 'A integração com M-Pesa e e-Mola facilitou muito as vendas online. Os clientes adoram o delivery.' },
];

const PARTNERS = [
  'Ministério da Saúde', 'M-Pesa', 'Vodacom', 'Farmacêuticos',
];

/* ────────────────────────────────────────────
   Component: StatCounter
   ──────────────────────────────────────────── */
function StatCounter({ value, label }: { value: number; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div className="text-center">
      <span ref={ref} className="text-3xl md:text-4xl font-bold text-white tabular-nums">
        {count.toLocaleString('pt-MZ')}+
      </span>
      <p className="text-sm text-teal-100 mt-1">{label}</p>
    </div>
  );
}

/* ────────────────────────────────────────────
   Landing Page
   ──────────────────────────────────────────── */
export default function Landing() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden relative">
      {/* Animated Background */}
      <AnimatedBackground variant="hero" className="fixed inset-0" />
      <SEOHead
        title="MedWallet MZ — A Tua Saúde, Na Tua Mão"
        description="Primeira super-app de saúde de Moçambique. Consultas online, farmácia delivery, carteira digital M-Pesa/e-Mola e muito mais. Disponível em todas as 12 províncias."
        path="/landing"
      />

      {/* ──── Hero ──── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 md:pt-36 md:pb-28">
        {/* Gradient orbs background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/20 blur-3xl animate-pulse" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] rounded-full bg-indigo-500/15 blur-3xl animate-pulse [animation-delay:1s]" />
        </div>

        <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight max-w-4xl">
          <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            A Tua Saúde, Na Tua Mão
          </span>
        </h1>
        <p className="relative mt-6 max-w-2xl text-lg md:text-xl text-slate-300">
          Primeira super-app de saúde de Moçambique. Consultas, farmácia, veterinária e pagamentos&nbsp;—&nbsp;tudo num só lugar.
        </p>

        <div className="relative mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-teal-500/25 transition-transform hover:scale-105 active:scale-95"
          >
            <Zap className="w-5 h-5" />
            Começar Agora
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-8 py-3.5 font-semibold text-slate-200 transition-colors hover:border-teal-400 hover:text-teal-300"
          >
            <Video className="w-5 h-5" />
            Ver Demonstração
          </a>
        </div>
      </section>

      {/* ──── Stats Bar ──── */}
      <section className="bg-gradient-to-r from-teal-600 to-indigo-600 py-10 px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value={2847} label="Utilizadores" />
          <StatCounter value={150} label="Farmácias" />
          <StatCounter value={85} label="Clínicas" />
          <StatCounter value={12} label="Províncias" />
        </div>
      </section>

      {/* ──── Features Grid ──── */}
      <section id="features" className="py-20 px-4">
        <h2 className="text-center text-3xl md:text-4xl font-bold">
          Tudo o que precisa,{' '}
          <span className="bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            numa só app
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
          Seis serviços integrados pensados para moçambicanos.
        </p>

        <div className="mx-auto mt-14 max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition-all hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex rounded-xl bg-teal-500/10 p-3 text-teal-400 transition-colors group-hover:bg-teal-500/20">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──── Province Coverage ──── */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-indigo-400 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            Cobertura Nacional
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">
            Cobrimos Todas as{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">
              12 Províncias
            </span>
          </h2>
          <p className="mt-4 text-slate-400">
            Do Maputo ao Niassa — estamos em todo o país.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {PROVINCES.map((p) => (
              <span
                key={p}
                className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-teal-500 hover:text-teal-300"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Trust / Testimonials ──── */}
      <section className="py-20 px-4">
        <h2 className="text-center text-3xl md:text-4xl font-bold">
          Confiança de{' '}
          <span className="bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            Milhares
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
          Veja o que dizem os nossos utilizadores.
        </p>

        <div className="mx-auto mt-14 max-w-5xl grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-4 flex gap-1 text-yellow-400">★★★★★</div>
              <p className="text-sm leading-relaxed text-slate-300 italic">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 text-white font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Partner logos placeholder */}
        <div className="mt-16 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-6">Parceiros de Confiança</p>
          <div className="flex flex-wrap justify-center gap-6">
            {PARTNERS.map((name) => (
              <div
                key={name}
                className="flex h-12 items-center rounded-lg border border-slate-800 bg-slate-800/40 px-6 text-sm text-slate-500"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Final CTA ──── */}
      <section className="py-20 px-4 bg-gradient-to-br from-teal-600 to-indigo-600 text-center">
        <Calendar className="mx-auto mb-4 w-10 h-10 text-teal-200" />
        <h2 className="text-3xl md:text-4xl font-bold">
          Junte-se a Milhares de Moçambicanos
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-teal-100">
          Registe-se gratuitamente e comece a cuidar da sua saúde de forma inteligente.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col sm:flex-row gap-3 px-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@exemplo.co.mz"
            className="flex-1 rounded-full border-0 bg-white/10 px-5 py-3 text-white placeholder:text-teal-200/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-teal-700 shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Users className="w-5 h-5" />
            Criar Conta
          </Link>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <footer className="border-t border-slate-800 py-10 px-4">
        <div className="mx-auto max-w-5xl flex flex-col items-center gap-4 text-center text-sm text-slate-400">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/legal" className="hover:text-teal-400 transition-colors">Termos</Link>
            <Link to="/legal/privacy" className="hover:text-teal-400 transition-colors">Privacidade</Link>
            <Link to="/help" className="hover:text-teal-400 transition-colors">Ajuda</Link>
            <Link to="/partners" className="hover:text-teal-400 transition-colors">Parceiros</Link>
          </div>
          <p className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            Feito com ❤️ em Moçambique
          </p>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} MedWallet MZ — Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
