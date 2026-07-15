/**
 * src/pages/ApeNetwork.tsx
 * ====================================================================
 * Rede de APEs Pública — visibilidade da rede comunitária de saúde.
 *
 * Mostra:
 *  - Número de APEs activos por província
 *  - APEs com melhor performance (anonimizado)
 *  - Como se tornar APE MedWallet (CTA)
 *  - Bónus M-Pesa por paciente activo
 *
 * Constrói confiança pública: a plataforma é apoiada pela rede comunitária
 * de saúde, não é "apenas mais uma app".
 * ====================================================================
 */

import { Seo } from '@/components/Seo';
import { motion } from 'framer-motion';
import {
  Users, MapPin, Award, Wallet, HeartHandshake,
  TrendingUp, ShieldCheck, ArrowRight, Phone, Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import NumberFlow from '@number-flow/react';

const APE_BY_PROVINCE = [
  { province: 'Maputo Cidade', count: 184, color: 'bg-emerald-500' },
  { province: 'Maputo Província', count: 312, color: 'bg-teal-500' },
  { province: 'Gaza', count: 248, color: 'bg-cyan-500' },
  { province: 'Inhambane', count: 156, color: 'bg-blue-500' },
  { province: 'Sofala', count: 287, color: 'bg-indigo-500' },
  { province: 'Manica', count: 174, color: 'bg-violet-500' },
  { province: 'Tete', count: 198, color: 'bg-purple-500' },
  { province: 'Zambézia', count: 412, color: 'bg-fuchsia-500' },
  { province: 'Nampula', count: 386, color: 'bg-pink-500' },
  { province: 'Cabo Delgado', count: 142, color: 'bg-rose-500' },
  { province: 'Niassa', count: 98, color: 'bg-orange-500' },
];

const TOTAL_APES = APE_BY_PROVINCE.reduce((a, b) => a + b.count, 0);
const MAX_PROVINCE = Math.max(...APE_BY_PROVINCE.map((p) => p.count));

const TOP_APES = [
  { initials: 'A.M.', province: 'Zambézia', patients: 184, monthsActive: 14 },
  { initials: 'F.C.', province: 'Nampula', patients: 167, monthsActive: 11 },
  { initials: 'H.J.', province: 'Sofala', patients: 142, monthsActive: 9 },
  { initials: 'M.S.', province: 'Maputo Prov.', patients: 138, monthsActive: 12 },
  { initials: 'R.T.', province: 'Tete', patients: 121, monthsActive: 8 },
];

export default function ApeNetwork() {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Rede APE — MedWallet MZ"
        description="Rede de Agentes Polivalentes Elementares (APEs) activos em Moçambique usando o MedWallet MZ para servir as suas comunidades."
      />
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <HeartHandshake className="h-36 w-36" />
          </div>
          <div className="relative">
            <Badge className="bg-white/20 text-white border-0 mb-3">
              <ShieldCheck className="h-3 w-3 mr-1" /> Rede Comunitária de Saúde
            </Badge>
            <h1 className="text-3xl font-bold">Rede APE MedWallet</h1>
            <p className="mt-2 text-sm text-amber-50 max-w-2xl">
              Agentes Polivalentes Elementares (APEs) são a espinha dorsal da saúde rural em
              Moçambique. O MedWallet MZ equipa-os com IA, geolocalização, M-Pesa e WhatsApp —
              amplificando o seu impacto comunitário.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div>
                <div className="text-2xl font-bold">
                  <NumberFlow value={TOTAL_APES} separator="." />
                </div>
                <div className="text-xs text-amber-100">APEs activos</div>
              </div>
              <div className="h-10 w-px bg-white/30" />
              <div>
                <div className="text-2xl font-bold">11</div>
                <div className="text-xs text-amber-100">Províncias</div>
              </div>
              <div className="h-10 w-px bg-white/30" />
              <div>
                <div className="text-2xl font-bold">250 MZN</div>
                <div className="text-xs text-amber-100">Bónus/paciente D30</div>
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por província */}
        <Card className="mt-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-bold">Distribuição por província</h2>
            </div>
            <div className="space-y-2">
              {APE_BY_PROVINCE.map((p, i) => (
                <motion.div
                  key={p.province}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-32 text-xs text-muted-foreground shrink-0">{p.province}</div>
                  <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(p.count / MAX_PROVINCE) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.04, ease: 'easeOut' }}
                      className={`h-full ${p.color} flex items-center justify-end pr-2`}
                    >
                      <span className="text-[10px] font-bold text-white">
                        <NumberFlow value={p.count} />
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top performers */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold">APEs em destaque</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOP_APES.map((ape, i) => (
              <motion.div
                key={ape.initials}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="border-amber-100">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">
                        {ape.initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{ape.initials}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {ape.province}
                        </div>
                      </div>
                      {i === 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                          #1
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-muted-foreground text-[10px]">Pacientes activos</div>
                        <div className="font-bold text-base">
                          <NumberFlow value={ape.patients} />
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-muted-foreground text-[10px]">Meses activos</div>
                        <div className="font-bold text-base">{ape.monthsActive}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground text-center">
            Iniciais apenas — identidade protegida conforme Lei 18/2004.
          </p>
        </div>

        {/* Benefícios APE */}
        <Card className="mt-6 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-600" /> Benefícios para APEs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  icon: Wallet,
                  title: 'Bónus M-Pesa 250 MZN',
                  desc: 'Por cada paciente activo durante 30 dias (D30). Recebimento semanal via M-Pesa.',
                },
                {
                  icon: Users,
                  title: 'Conta Pro Grátis',
                  desc: 'Acesso completo ao MedWallet Pro (1.500 MZN/mês) sem custo para APEs verificados.',
                },
                {
                  icon: TrendingUp,
                  title: 'Pulse points',
                  desc: 'Cada triagem e registo vale Pulse points convertíveis em bónus M-Pesa.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Formação certificada',
                  desc: 'Curso online + certificado MedWallet/MISAU após 50 pacientes activos.',
                },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{b.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {b.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* CTA tornar-se APE */}
        <Card className="mt-6 bg-gradient-to-br from-orange-600 to-amber-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold">É APE? Junte-se à rede MedWallet</h2>
                <p className="text-sm text-orange-50 mt-1">
                  Registo gratuito · verificação por supervisor MISAU · bónus a partir do 1º paciente.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/auth')}
                  className="bg-white text-orange-700 hover:bg-orange-50"
                >
                  Registar como APE <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacto supervisor */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Phone className="inline h-3 w-3 mr-1" />
          Suporte APE: <a href="tel:+258840000000" className="underline">+258 84 000 0000</a> ·
          WhatsApp 24/7
        </div>
      </div>
    </>
  );
}
