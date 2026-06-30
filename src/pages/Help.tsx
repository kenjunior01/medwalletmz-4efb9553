import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Mail,
  HelpCircle,
  ChevronRight,
  ShoppingBag,
  Truck,
  CreditCard,
  User,
  MapPin,
  Star,
  Shield,
  Clock,
  Wallet,
  Handshake,
  BookOpen,
  Bell,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const WHATSAPP_NUMBER = '258840000000';

const supportOptions = [
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    description: 'Resposta em minutos',
    action: () => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank'),
    color: 'bg-green-500',
  },
  {
    icon: Phone,
    label: 'Ligar',
    description: '+258 84 000 0000',
    action: () => window.open('tel:+258840000000', '_blank'),
    color: 'bg-blue-500',
  },
  {
    icon: Mail,
    label: 'Email',
    description: 'suporte@mozambiapp.co.mz',
    action: () => window.open('mailto:suporte@mozambiapp.co.mz', '_blank'),
    color: 'bg-purple-500',
  },
];

const faqCategories = [
  {
    icon: ShoppingBag,
    title: 'Pedidos',
    questions: [
      {
        q: 'Como faço um pedido?',
        a: 'Basta escolher uma farmácia, adicionar itens ao carrinho e finalizar o checkout com o seu endereço e método de pagamento preferido.',
      },
      {
        q: 'Posso cancelar um pedido?',
        a: 'Sim, você pode cancelar antes do pedido ser confirmado pela farmácia. Após a confirmação, entre em contacto com o suporte.',
      },
      {
        q: 'Como vejo o histórico de pedidos?',
        a: 'Acesse a aba "Pedidos" no menu inferior para ver todos os seus pedidos ativos e histórico.',
      },
    ],
  },
  {
    icon: Truck,
    title: 'Entregas',
    questions: [
      {
        q: 'Qual o tempo de entrega?',
        a: 'O tempo varia de 20 a 60 minutos, dependendo da distância e tipo de estabelecimento.',
      },
      {
        q: 'Como rastreio minha entrega?',
        a: 'Quando o entregador estiver a caminho, você verá um mapa em tempo real na página do pedido.',
      },
      {
        q: 'E se o entregador não encontrar meu endereço?',
        a: 'O entregador ligará para você. Certifique-se de adicionar pontos de referência no endereço.',
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Pagamentos & M-Pesa',
    questions: [
      {
        q: 'Quais métodos de pagamento são aceites?',
        a: 'Aceitamos M-Pesa, e-Mola, Mkesh e a carteira MedWallet (MZN). O pagamento é feito na confirmação do pedido ou da consulta.',
      },
      {
        q: 'Como deposito na minha carteira MedWallet via M-Pesa?',
        a: 'Abre M-Pesa → "Enviar dinheiro" → insere o número MedWallet → mete o valor → confirma. O saldo é creditado em segundos. Vê o passo-a-passo ilustrado abaixo.',
      },
      {
        q: 'É seguro pagar pelo app?',
        a: 'Sim! Usamos encriptação de ponta a ponta e não armazenamos dados sensíveis. As transações M-Pesa são processadas pela Vodacom.',
      },
      {
        q: 'Posso pedir reembolso?',
        a: 'Sim, em caso de problemas com o pedido ou consulta. Entre em contacto com o suporte via WhatsApp para solicitar.',
      },
    ],
  },
  {
    icon: Stethoscope,
    title: 'Consultas & Telemedicina',
    questions: [
      {
        q: 'Como funciona a teleconsulta por vídeo?',
        a: 'Marca a consulta, e na hora agendada recebes um botão "Iniciar vídeo" no chat. Funciona directamente no browser, sem instalar nada.',
      },
      {
        q: 'Posso avaliar o médico depois?',
        a: 'Sim! Após cada consulta, podes dar 1–5 estrelas e deixar um comentário. A tua avaliação ajuda outros pacientes.',
      },
      {
        q: 'Não há médico na minha especialidade. O que faço?',
        a: 'Podes juntar-te à lista de espera — avisamos-te assim que houver profissional disponível. Entretanto, fala com clínico geral ou faz triagem com IA.',
      },
    ],
  },
  {
    icon: User,
    title: 'Conta',
    questions: [
      {
        q: 'Como altero meus dados?',
        a: 'Acesse seu Perfil e clique em "Editar" para alterar nome, telefone ou foto.',
      },
      {
        q: 'Esqueci minha senha',
        a: 'Na tela de login, clique em "Esqueci a senha" e siga as instruções enviadas por email.',
      },
      {
        q: 'Como apago minha conta?',
        a: 'Entre em contacto com o suporte via WhatsApp para solicitar a exclusão da conta.',
      },
    ],
  },
];

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.questions.length > 0);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Ajuda & Suporte</h1>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Como podemos ajudar?</h2>
          <p className="text-muted-foreground">
            Encontre respostas ou fale com a nossa equipa
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquisar ajuda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-3 gap-3">
          {supportOptions.map((option, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={option.action}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={`w-12 h-12 rounded-full ${option.color} flex items-center justify-center mx-auto mb-2`}
                >
                  <option.icon className="h-5 w-5 text-white" />
                </div>
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Support Hours */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Horário de Atendimento</p>
              <p className="text-sm text-muted-foreground">
                WhatsApp: 24/7 • Telefone: 08:00 - 22:00
              </p>
            </div>
          </CardContent>
        </Card>

        {/* M-Pesa Quick Guide (rec 5.3 — integração M-Pesa) */}
        <Card className="overflow-hidden border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-sm">M-Pesa em 4 passos</p>
                <p className="text-[11px] text-muted-foreground">Como depositar na tua carteira MedWallet</p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-700 border-amber-500/30 text-[9px]">RECOMENDADO</Badge>
            </div>
            <ol className="text-xs space-y-1.5 mt-2 list-decimal pl-5 text-foreground/90">
              <li>Abre o <strong>M-Pesa</strong> e escolhe <strong>Enviar dinheiro</strong>.</li>
              <li>Insere o número MedWallet: <strong>84 000 0000</strong>.</li>
              <li>Indica o valor (mín. 50 MZN) e confirma com o teu PIN.</li>
              <li>Recebes o saldo na carteira MedWallet em segundos.</li>
            </ol>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Também aceitamos <strong>e-Mola</strong> e <strong>Mkesh</strong> nas consultas e farmácia.
            </p>
          </CardContent>
        </Card>

        {/* Quick actions (rec 5.2 / 5.3 — parcerias + educação + lista de espera) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/health/education')}
            className="bento-card p-3 flex flex-col items-center gap-1 text-center hover:shadow-md transition"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-semibold">Saúde MZ</span>
          </button>
          <button
            onClick={() => navigate('/partners')}
            className="bento-card p-3 flex flex-col items-center gap-1 text-center hover:shadow-md transition"
          >
            <Handshake className="h-5 w-5 text-secondary" />
            <span className="text-[10px] font-semibold">Parcerias</span>
          </button>
          <button
            onClick={() => navigate('/referrals')}
            className="bento-card p-3 flex flex-col items-center gap-1 text-center hover:shadow-md transition"
          >
            <Bell className="h-5 w-5 text-gold" />
            <span className="text-[10px] font-semibold">Convida</span>
          </button>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Perguntas Frequentes</h3>

          {(searchQuery ? filteredCategories : faqCategories).map(
            (category, catIndex) => (
              <Card key={catIndex}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-primary" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, qIndex) => (
                      <AccordionItem key={qIndex} value={`${catIndex}-${qIndex}`}>
                        <AccordionTrigger className="text-left text-sm">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-4 py-6">
          <div className="text-center">
            <Shield className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-xs font-medium">Pagamento Seguro</p>
          </div>
          <div className="text-center">
            <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-xs font-medium">4.8 Estrelas</p>
          </div>
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-xs font-medium">Maputo & mais</p>
          </div>
        </div>
      </div>
    </div>
  );
}
