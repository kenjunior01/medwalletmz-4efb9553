/**
 * src/pages/health/edu/HealthEducationHub.tsx
 * ====================================================================
 * Hub de Educação em Saúde — gateway de aquisição gratuita.
 *
 * Estratégia de adopção:
 *  - Conteúdo 100% gratuito (sem paywall) → SEO orgânico
 *  - Artigos em PT + 4 línguas locais (Emakhuwa, Xitsonga, Changana, Sena)
 *  - Vídeos curtos referenciados (placeholder para uploads futuros)
 *  - Quizzes gamificados (Pulse points)
 *  - Validação clínica: MISAU/OMS protocolos
 *
 * Cada artigo pode ser lido anonimamente. Após leitura, prompt suave:
 * "Crie conta grátis para guardar o seu progresso e receber lembretes".
 * ====================================================================
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Seo } from '@/components/Seo';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Bug, Baby, HeartPulse, Pill, Droplet, Brain,
  Stethoscope, AlertTriangle, Sparkles, Clock, ArrowRight,
  Languages, PlayCircle, Award, CheckCircle2, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Lang = 'pt' | 'emakhuwa' | 'tsonga' | 'changana' | 'sena';

interface Article {
  id: string;
  title: Record<Lang, string>;
  category: 'malaria' | 'tb' | 'materna' | 'arv' | 'nutricao' | 'vacinas' | 'cronico' | 'geral';
  minutesRead: number;
  excerpt: Record<Lang, string>;
  body: Record<Lang, string[]>; // paragraphs
  icon: typeof Bug;
  color: string;
}

const ARTICLES: Article[] = [
  {
    id: 'malaria-sintomas-tratamento',
    title: {
      pt: 'Malária: sintomas, teste RDT e tratamento',
      emakhuwa: 'Malaría: atthu, exame RDT ni mutthunelo',
      tsonga: 'Malaria: vitiomi, xikambahyelo ni ku_tlhavela',
      changana: 'Malaria: swihombe, xikambahyelo ni ku pfuxa',
      sena: 'Malaria: utaji, exame RVT ni mutthanilo',
    },
    category: 'malaria',
    minutesRead: 4,
    icon: Bug,
    color: 'bg-rose-100 text-rose-700',
    excerpt: {
      pt: 'Aprenda a reconhecer os sinais precoces da malária e quando procurar tratamento em 24 horas.',
      emakhuwa: 'Wixihi othanla awehaweha atthu oopatthani a malaría ni epakha okhume mutthunelo 24 horas.',
      tsonga: 'Tlhela u tirhisa vitiomi bya malaria bya ntshumelo ni xighono kuendlela ku lava ku tlhavela hakanyingi 24 tiawara.',
      changana: 'Tlhela u tirhisa swihombe swa malaria swa ntshumelo ni xighono kuendlela ku lava ku pfuxa hakanyingi 24 tiawara.',
      sena: 'Tshoni ku vaya ku litha utaji wa malaria unga thoma ni ntharika yaku pfuniwa m\u2019maasini awa 24.',
    },
    body: {
      pt: [
        'A malária é a principal causa de mortalidade infantil em Moçambique, responsável por aproximadamente 29% das mortes em crianças menores de 5 anos. A transmissão ocorre todo o ano, com picos durante a estação chuvosa (Novembro a Abril), sobretudo nas províncias do norte e centro do país.',
        'Os sintomas clássicos são febre, calafrios, dores de cabeça, dores musculares e fraqueza. Em crianças pequenas, podem incluir vómitos, recusa alimentar e sonolência. Sinais de alarme que exigem referência IMEDIATA ao hospital incluem: dificuldade respiratória, convulsões, sonolência extrema, urina escura, icterícia (olhos amarelos) ou sangramento.',
        'O teste rápido de diagnóstico (RDT) é gratuito em todas as unidades sanitárias do SNS. Em 15 minutos sabe se é malária. NÃO se deve tratar sem teste confirmatório, excepto em crianças com febre em zona de alta transmissão quando não há RDT disponível.',
        'O tratamento recomendado pelo MISAU é a Artemisinina-based Combination Therapy (ACT), especificamente Artemeter-Lumefantrina (AL), tomada durante 3 dias. É CRUCIAL completar todos os comprimidos mesmo que os sintomas desapareçam no segundo dia — caso contrário, o parasita pode voltar mais forte e resistente.',
        'A prevenção baseia-se em três pilares: (1) uso de redes mosquiteiras tratadas com inseticida (ITN) todas as noites, (2) controlo de águas estagnadas em redor da casa, e (3) quimioprofilaxia para mulheres grávidas (SP) a partir do 2º trimestre.',
      ],
      emakhuwa: [
        'Malaría etthu ene emosa ya owoneya awana ohinyala ihopa sikola iwraka sa 5 sanakwawene. Yohukhumexa ohimwarya mwaka otheene, tho ohukhuma okhisinari (Novemburu mpakha Abril), elutteleli ni província ya othi ni nlepa.',
        'Atthu oopatthani: ferve, vamaka, nlhuko ya mutthu, nlhuko ya ihopa, ni wixuttiha. Athiana anakhala ophiyaka wiirela ihopa, vamwarya, ohiwa muryo, ni ohiphita. Atthu oolavulela awehaweha: vavasoro oceliwa, nkharamo, okhotta ehupi, epula ya mukhali, ni osoma ihopa.',
        'Exame RDT ya xahala m\u2019kiliniku sotheene so MISAU. 15 minuti yohiwa yuulale malaría. KHAMOSA mwaavaha mutthunelo yuopattha exame kaamawii ohiwa, sovarela awehana axinxwana aavehi ferve waapaka m\u2019eprovíncia ya ohuwanela niyu RDT yohinleela.',
        'Mutthunelo oohukumela MISAU ti ACT (Artemeter-Lumefantrina), woirela miloko 3. KINHIMYA wiirela mwaavaha sotheene sintoko mannamuna owiipwexa, yuopattha yooromeleya.',
        'Opakeniwa ti miloko 3: (1) nsuwa ya mosquito, (2) yuuhumiha m\u2019matthi wa ampili, (3) woirela axithiana aavahiwa mihokororo SP mwa nsina na 2.',
      ],
      tsonga: [
        'Malaria i nchumu lowu khomaka ngopfu e Mozambique, lowu dlayaka 29% wa vana lava nga cossi malembe ya 5. Ku tfumela ku tshama ka nkarhi hinkwawo, hinkarhi wa mpfhumba lowu nga na mati (Nwendzamhuri kuya e Ndzhendzamhuri).',
        'Vitiomi bya malaria: fiva, ku titimela, nhlohlo, ku va ni nhombamo ka miri, na ku nga na matimba. Vitiomi bya xihatla: ku hava mphefumlo, ku khoma nhloko, ku etlela hi tshikelo, mati ya ntima, mahlo yo tshuka.',
        'Xikambahyelo xa RDT xa ximunghana e tikliniki hinkwato. 15 timo kuya tshama u nga sivoniwa. A wu faneleri ku tirisela mutshu wu nga sivonanga.',
        'Mutshu wa MISAU i ACT (Artemeter-Lumefantrina), ku nwiwa masiku 3. Fanela ku hela mutshu hinkwawo hileswi vitiomi byi tsakeke.',
        'Ku sivela: (1) khava ya mosquito, (2) ku hlongola mati lama fimiwaka kaya, (3) ku nyika vakhevani wa SP kusuka e ka thanglo ya vumbirhi.',
      ],
      changana: [
        'Malaria i nchumu lowu khomaka ngopfu e Mozambique, lowu dlayaka 29% wa vana lava nga cossi malembe ya 5. Ku tfumela ku tshama ka nkarhi hinkwawo, hinkarhi wa mpfhumba lowu nga na mati.',
        'Swihombe swa malaria: fiva, ku titimela, nhlohlo, ku va ni nhombamo ka miri, na ku nga na matimba. Swihombe swa xihatla: ku hava mphefumlo, ku khoma nhloko, ku etlela hi tshikelo, mati ya ntima, mahlo yo tshuka.',
        'Xikambahyelo xa RDT xa ximunghana e tikliniki hinkwato. 15 timo kuya tshama u nga sivoniwa. A wu faneleri ku tirisela mutshu wu nga sivonangi.',
        'Mutshu wa MISAU i ACT (Artemeter-Lumefantrina), ku nwiwa masiku 3. Fanela ku hela mutshu hinkwawo hileswi swihombe swi tsakeke.',
        'Ku sivela: (1) khava ya mosquito, (2) ku hlongola mati lama fimiwaka kaya, (3) ku nyika vakhevani wa SP kusuka e ka thanglo ya vumbirhi.',
      ],
      sena: [
        'Malaria ni nchumu wau khomaka ngopfu m\u2019Mozambique, wau dlaya 29% wa vana va pasi malemba ga 5. Utau uluka nthawi yose, n\u2019nthawi ya vula (Novembro kufika Apri).',
        'Utaji wa malaria: fivu, wutwisisa, khoho, wubaba, kumbukausalila. Utaji wau luka: masa ku phefumila, khoho, lala, masa wakutusa, machiinu ngawu kora.',
        'Exame RVT kubwerera m\u2019klinik yose dha MISAU. 15 minuti kubvira kuziba. Kutakhata wapeza dha chidzidzi ukagonja.',
        'Mutthanilo wa MISAU ndi ACT (Artemeter-Lumefantrina), dhuwa masiku 3. Afana wugwesa dhuwa wose ngati dhadhidzi dhalukapo.',
        'Kusivirila: (1) khava ya mboni, (2) kuthothola madzi oima pakhaya, (3) kupata vakha wakha SP kuchokila m\u2019nthengwa wa wumbili.',
      ],
    },
  },
  {
    id: 'tb-sintomas-tratamento',
    title: {
      pt: 'Tuberculose: sinais, teste de escarro e tratamento DOTS',
      emakhuwa: 'Tuberculose: atthu, exame ya muxexe ni mutthunelo DOTS',
      tsonga: 'Tuberculosis: vitiomi, xikambahyelo xa khwiri ni mutshu wa DOTS',
      changana: 'Tuberculose: swihombe, xikambahyelo xa khwiri ni mutshu wa DOTS',
      sena: 'Tuberculose: utaji, exame ya khoshi ni mutthanilo DOTS',
    },
    category: 'tb',
    minutesRead: 5,
    icon: Stethoscope,
    color: 'bg-amber-100 text-amber-700',
    excerpt: {
      pt: 'Tosse há mais de 2 semanas? Pode ser TB. Saiba como é feito o diagnóstico gratuito e o tratamento DOTS.',
      emakhuwa: 'Okhotta mahiku maxeerya 2? Wira va TB. Wixihi wooneha exame ya xahala ni mutthunelo DOTS.',
      tsonga: 'Ku khohla masiku yo tlula 2? I nga va TB. Tlhela u vona xikambahyelo xa ximunghana ni mutshu wa DOTS.',
      changana: 'Ku khohla masiku yo tlula 2? I nga va TB. Tlhela u vona xikambahyelo xa ximunghana ni mutshu wa DOTS.',
      sena: 'Khohola masiku akudzula 2? Tungamala TB. Tsoni kuona exame ya bwerera ni mutthanilo DOTS.',
    },
    body: {
      pt: [
        'A tuberculose (TB) é uma doença bacteriana causada pelo Mycobacterium tuberculosis, que afecta principalmente os pulmões. Moçambique está entre os 30 países de alta carga de TB no mundo, com aproximadamente 170.000 novos casos por ano, dos quais 70.000 são co-infectados com VIH.',
        'Os sintomas cardinais são tosse persistente por mais de 2 semanas, febre vespertina, suores nocturnos, perda de peso inexplicada e cansaço extremo. Em casos avançados pode haver hemoptise (tosse com sangue) — sinal de alarme que exige referência IMEDIATA.',
        'O diagnóstico é gratuito em todas as unidades sanitárias do SNS. Faz-se através do teste de escarro (BAAR / GeneXpert), que detecta a bactéria em 2 horas (GeneXpert) ou 24h (BAAR convencional). Em crianças que não conseguem expectorar, usa-se aspirado gástrico.',
        'O tratamento DOTS (Directly Observed Treatment, Short-course) dura 6 meses e é gratuito. Os primeiros 2 meses usam 4 fármacos (Rifampicina, Isoniazida, Pirazinamida, Etambutol); os 4 meses seguintes usam 2 (Rifampicina + Isoniazida). É CRUCIAL completar o tratamento — caso contrário, a TB pode voltar resistente (TB-MDR), cujo tratamento dura 2 anos e tem efeitos secundários graves.',
        'Em Moçambique, todos os pacientes com TB devem ser testados para VIH. Se positivo, devem iniciar ARV (TDF/3TC/DTG) dentro de 2 semanas. A co-infecção TB-VIH é a principal causa de morte em adultos jovens — o tratamento conjunto reduz mortalidade em 60%.',
      ],
      emakhuwa: [
        'TB etthu ene emosa ya bactéria (Mycobacterium tuberculosis), elutteleli ohupi. Moçambique etthu emosa ya 30 província ya ohuwanela TB, ni 170.000 axihamwaka nsuwa, ya 70.000 na VIH.',
        'Atthu: okhotta mahiku maxeerya 2, ferve vahivona, vamaka vamakha, ohiiwa nlhuku, ni wixuttiha. Epakha yopacerya, okhotta ni epula — atthu oolavulela awehaweha.',
        'Exame ya xahala m\u2019kiliniku sotheene. Wooneha muxexe (BAAR / GeneXpert), 2 horas (GeneXpert) wala 24h (BAAR). Athiyana axinxwana ohiwa muxexe, vasya aspirado gástrico.',
        'Mutthunelo DOTS ya miloko 6, xahala. Miloko 2 yopacerya yirela 4 mutthunelo; 4 miloko ivinre yirela 2. KINHIMYA wohelela sotheene — yuopattha TB-MDR, mutthunelo 2 mahiku, ni atthu makina.',
        'Moçambique, athiyana oohamwa TB vasya exame VIH. Yuupattha, vasya ARV (TDF/3TC/DTG) mwa miloko 2. TB-VIH ti etthu yootela axilipa — yuuhimya mutthunelo vamwarya owoopela 60%.',
      ],
      tsonga: [
        'TB i vuvabyi bya bactéria (Mycobacterium tuberculosis) byi khomaka swifhinga swa moya. Mozambique i kwalano ka 30 wa tiko letso nga ni TB yo tala, na 170.000 wa vabyi va ntshumelo, 70.000 wa kona na VIH.',
        'Vitiomi: ku khohla masiku yo tlula 2, fiva ya madzimbongwa, ku siva hi vusiwana, ku tlula mpimo wa ku ringeta, ku nga na matimba. Vitiomi bya xihatla: ku khohla ni ngati.',
        'Xikambahyelo xa ximunghana e tikliniki hinkwato. Ku эндлelwa hi ku lavender khwiri (BAAR / GeneXpert).',
        'Mutshu wa DOTS wa masiku 6, wa ximunghana. Masiku 2 yo sungula wa 4 wa mutshu; masiku 4 wa ti ya 2. A wu faneleri ku yisa mutshu.',
        'Mozambique, vabyi hinkwavo va TB va fanela ku laviwa hi VIH. Lava nga na, va fanela ku thoma ARV.',
      ],
      changana: [
        'TB i vuvabyi bya bactéria (Mycobacterium tuberculosis) byi khomaka swifhinga swa moya. Mozambique i kwalano ka 30 wa tiko letso nga ni TB yo tala.',
        'Swihombe: ku khohla masiku yo tlula 2, fiva ya madzimbongwa, ku siva hi vusiwana, ku tlula mpimo wa ku ringeta, ku nga na matimba.',
        'Xikambahyelo xa ximunghana e tikliniki hinkwato. Ku endlwa hi ku lavender khwiri (BAAR / GeneXpert).',
        'Mutshu wa DOTS wa masiku 6, wa ximunghana. Masiku 2 yo sungula wa 4 wa mutshu; masiku 4 wa ti ya 2. A wu faneleri ku yisa mutshu.',
        'Mozambique, vabyi hinkwavo va TB va fanela ku laviwa hi VIH. Lava nga na, va fanela ku thoma ARV.',
      ],
      sena: [
        'TB i vuvabi wa bactéria (Mycobacterium tuberculosis) wau khomaka m\u2019mapapila. Mozambique ni pakati wa 30 dziko dha TB, na 170.000 vahuna paaka, 70.000 dha nao na VIH.',
        'Utaji: khohola masiku akudzula 2, fivu ya madezibonga, lala nthawi ya usiku, kupotola kusenya, kwenda wudzinja. Sina dha konda: khohola na magazi.',
        'Exame ya bwerera m\u2019klinik yose. Kubvira mwa kupanga khoshi (BAAR / GeneXpert).',
        'Mutthanilo DOTS wa masiku 6, wa bwerera. Masiku 2 aoyamba wa 4 wa mutthanilo; masiku 4 akutsata wa 2. Afana wugwesa.',
        'Mozambique, vahuna wose wa TB afana kupezwa VIH. Wadutsa, afana kuthamangira ARV.',
      ],
    },
  },
  {
    id: 'gravidez-cuidados-pre-natais',
    title: {
      pt: 'Gravidez: cuidados pré-natais e sinais de alarme',
      emakhuwa: 'Eliwali: ovaraka mwa nsuwa ni atthu oolavulela',
      tsonga: 'Ku khomba: ku tlhokomelela ka nsiku hinkwawo ni vitiomi bya xihatla',
      changana: 'Ku khomba: ku tlhokomelela ka nsiku hinkwawo ni swihombe swa xihatla',
      sena: 'Ulimi: kulera m\u2019nthawi yose ni utaji wau luka',
    },
    category: 'materna',
    minutesRead: 6,
    icon: Baby,
    color: 'bg-pink-100 text-pink-700',
    excerpt: {
      pt: 'Pelo menos 4 consultas pré-natais gratuitas. Saiba quais os exames obrigatórios e os sinais que exigem ida imediata ao hospital.',
      emakhuwa: 'Mwaha mu 4 ya ovaraka xahala. Wixihi exame oromeleya ni atthu oolavulela ohomwa mwa phaaka kiliniku.',
      tsonga: 'Masiku yo tlula 4 ya ku lava ka ximunghana. Tlhela u vona vitiomi bya xihatla byi lavaka ku ya tikliniki hakanyingi.',
      changana: 'Masiku yo tlula 4 ya ku lava ka ximunghana. Tlhela u vona swihombe swa xihatla swi lavaka ku ya tikliniki hakanyingi.',
      sena: 'Angapo 4 ya kupezwa bwerera. Tsoni utaji wau luka wafana kupita klinik nthawi yose.',
    },
    body: {
      pt: [
        'A assistência pré-natal (ANC) é gratuita em todas as unidades sanitárias de Moçambique. A OMS recomenda pelo menos 8 contactos pré-natais, mas o MISAU garante um mínimo de 4 consultas com calendário definido: 1ª entre 8-12 semanas, 2ª entre 20-24, 3ª entre 28-32, 4ª entre 36-40.',
        'Em cada consulta são verificados: pressão arterial, peso, altura uterina, batimentos cardíacos fetais, e feitos exames de urina (proteínas), sangue (hemoglobina, grupo RH, sífilis, VIH, malária). A vacina antitetânica é administrada a partir da 1ª consulta se a mulher não estiver vacinada.',
        'Sinais de alarme durante a gravidez que exigem ida IMEDIATA ao hospital: (1) sangramento vaginal, (2) dor de cabeça intensa com visão turva (suspeita de pré-eclâmpsia), (3) inchaço repentino de pernas/rosto, (4) febre alta, (5) perda de líquido amniótico, (6) diminuição de movimentos fetais, (7) convulsões.',
        'A pré-eclâmpsia é uma das principais causas de mortalidade materna em Moçambique. Aparece após a 20ª semana e caracteriza-se por pressão arterial ≥140/90 mmHg com proteínas na urina. Se não tratada, evolui para eclâmpsia (convulsões) que pode matar mãe e bebé em horas. Por isso, toda mulher grávida com dor de cabeça intensa deve medir a pressão imediatamente.',
        'A nutrição durante a gravidez deve incluir: ferro + ácido fólico (distribuídos grátis nas consultas), proteínas (peixe, feijão, ovo), frutas e vegetais (vitamina A para a visão do bebé), e iodo (sal iodado). Evitar álcool, tabaco, e medicamentos sem receita. Pelo menos 1,5L de água por dia.',
      ],
      emakhuwa: [
        'ANC xahala m\u2019kiliniku sotheene. OMS elavula 8 ovaraka, masi MISAU ohuwa 4: 1ª 8-12 nsina, 2ª 20-24, 3ª 28-32, 4ª 36-40.',
        'Mwa ovaraka, wooneha: pwésa, nlhuku, uterino, m\u2019fere ya mwaana, ni exame ya muxexe (proteína), m\u2019paasi (hemoglobina, RH, sífilis, VIH, malaría). Vacina antitetânica yuupattha 1ª ovaraka.',
        'Atthu oolavulela: (1) epula ya muxexe, (2) nlhuko ya mutthu ni ohiweha (pré-eclâmpsia), (3) okhotta ya mahá, (4) ferve, (5) epula ya muxexe amniótico, (6) ohiphita mwaana, (7) nkharamo.',
        'Pré-eclâmpsia ti etthu yootela axithiana ohimwa. Yuupattha mwa nsina 20, ni pwésa ≥140/90 ni proteína m\u2019muxexe. Yuopattha eclâmpsia (nkharamo) yohiwa axithiana ni mwaana mwa masiha. Yothatu, axithiana ohimwa nlhuko ya mutthu vasya pwésa mwa phaaka.',
        'Muryo mwa eliwali: ferro + ácido fólico (xahala), proteína (ehopa, muxeeri, ekuku), matuwani ni maxunwa (vitamina A), ni iodo. Ohipha ekaruma, suta, ni mutthunelo yohinleela. Mwaha mu 1,5L ya mati mwa mahiku.',
      ],
      tsonga: [
        'ANC i xa ximunghana e tikliniki hinkwato. OMS yi lavisa 8, kambe MISAU u pima 4.',
        'Eka xikambahyelo: xikandzo, ntima, nkalo, vuvabyi bya n\'wana, ni mati ya xihlonga.',
        'Vitiomi bya xihatla: (1) ngati, (2) nhlohlo ni ku nga voni kahle, (3) ku fufuma ka milenge, (4) fiva, (5) mati, (6) n\'wana ku nga hakungeti, (7) ku khomiwa.',
        'Pre-eclampsia i nchumu lowu dlayaka vakhevani. Ku tshama u pima xikandzo.',
        'Kudya: xitshuri, na folic, protein, swakudya swa mihandla.',
      ],
      changana: [
        'ANC i xa ximunghana e tikliniki hinkwato. OMS yi lavisa 8, kambe MISAU u pima 4.',
        'Eka xikambahyelo: xikandzo, ntima, nkalo, vuvabyi bya n\'wana, ni mati ya xihlonga.',
        'Swihombe swa xihatla: (1) ngati, (2) nhlohlo ni ku nga voni kahle, (3) ku fufuma ka milenge, (4) fiva, (5) mati, (6) n\'wana ku nga hakungeti, (7) ku khomiwa.',
        'Pre-eclampsia i nchumu lowu dlayaka vakhevani. Ku tshama u pima xikandzo.',
        'Kudya: xitshuri, na folic, protein, swakudya swa mihandla.',
      ],
      sena: [
        'ANC ni wa bwerera m\u2019klinik yose. OMS akulisa 8, koma MISAU wapima 4.',
        'Paaka: magetsi, kunyoja, mwana, nthavi ya mwana, na madzi.',
        'Utaji wau luka: (1) magazi, (2) khoho na kusaona, (3) kuvimba thodo, (4) fivu, (5) madzi, (6) mwana kugwedezeka, (7) khwacha.',
        'Pre-eclampsia ni nchumu wau dlaya vakha. Apimire magetsi.',
        'Kudya: chitsulo, na folic, mapuloteni, chakudya cha mitsense.',
      ],
    },
  },
  {
    id: 'arv-adesao-tratamento',
    title: {
      pt: 'VIH/SIDA: adesão ao tratamento ARV (TLD)',
      emakhuwa: 'VIH/SIDA: ovaraka mutthunelo ARV (TLD)',
      tsonga: 'VIH/SIDA: ku landzisa mutshu wa ARV (TLD)',
      changana: 'VIH/SIDA: ku landzisa mutshu wa ARV (TLD)',
      sena: 'VIH/SIDA: kuvera mutthanilo wa ARV (TLD)',
    },
    category: 'arv',
    minutesRead: 5,
    icon: Pill,
    color: 'bg-emerald-100 text-emerald-700',
    excerpt: {
      pt: 'A toma do TLD (Tenofovir+Lamivudina+Dolutegravir) uma vez por dia mantém o VIH indetectável. Saiba porque NUNCA se pode parar.',
      emakhuwa: 'TLD (Tenofovir+Lamivudina+Dolutegravir) mahiku motheene. Wixihi khaahimya yuopattha.',
      tsonga: 'TLD (Tenofovir+Lamivudina+Dolutegravir) nkarhi hinkwawo. Tlhela u vona ha yini u nga boxi ku tshika.',
      changana: 'TLD (Tenofovir+Lamivudina+Dolutegravir) nkarhi hinkwawo. Tlhela u vona ha yini u nga boxi ku tshika.',
      sena: 'TLD (Tenofovir+Lamivudina+Dolutegravir) nthawi yose. Tsoni chifukwa chake upanda.',
    },
    body: {
      pt: [
        'Moçambique tem cerca de 2,4 milhões de pessoas vivendo com VIH (PVVIH), sendo o terceiro país do mundo com maior carga viral. O governo fornece tratamento ARV gratuito a todos os PVVIH desde 2004, e desde 2019 adoptou o regime TLD (Tenofovir + Lamivudina + Dolutegravir) como primeira linha por ser mais eficaz, com menos efeitos secundários e apenas 1 comprimido por dia.',
        'A toma deve ser feita TODOS OS DIAS, à MESMA HORA, preferencialmente à noite antes de dormir. Esquecer 1 dia não é catastrofal, mas esquecer regularmente permite que o vírus se multiplique e desenvolvida RESISTÊNCIA — situação em que o TLD deixa de funcionar e o paciente tem de mudar para regimes de 2ª linha, com mais comprimidos e mais efeitos secundários.',
        'A carga viral deve ser medida 6 meses após início do tratamento e depois anualmente. Se a carga for INDETECTÁVEL (<50 cópias/mL), significa que o tratamento está a funcionar, o sistema imunitário está a recuperar, e NÃO É POSSÍVEL transmitir o vírus sexualmente (conceito U=U: Undetectable = Untransmittable). Esta é a mensagem mais importante para desestigmatizar o VIH.',
        'Efeitos secundários comuns nas primeiras 4 semanas: dor de cabeça, náuseas, sonhos vividos, tonturas. Costumam desaparecer. Efeitos graves que exigem ida ao hospital: icterícia (olhos amarelos - lesão hepática), dor abdominal intensa, febre com erupção cutânea generalizada.',
        'A adesão é apoiada por grupos de ajuda mútua (GAAM) — grupos de 6-12 pessoas que se revezam para ir buscar medicação mensalmente, poupando viagens. O MedWallet MZ ajuda com lembretes diários via WhatsApp e notificações push, para nunca mais esquecer a toma.',
      ],
      emakhuwa: [
        'Moçambique elutteleli 2,4 miliyau ya athu na VIH. Mokonelo yaha mutthunelo ARV xahala since 2004, since 2019 TLD yahupatthiwa mwa mahina ya mutthunelo 1.',
        'TLD ya mahiku motheene, mwa epaaka yothene. Ohiwa 1 mahiku khanii owoneya, masi ohiwa nthano yuupattha RESISTÊNCIA — TLD khaavaha, ni vasya mutthunelo 2.',
        'Carga viral ya exame 6 mahiku vamwarya ni nthano yuupattha. INDETECTÁVEL (<50) — mutthunelo vamwarya, ni KHAAHIMYA yuopattha VIH mwa epula (U=U).',
        'Atthu makina mwa miloko 4: nlhuko ya mutthu, vamwarya, epaaka vamwarya, wixuttiha. Atthu oolavulela: osoma ihopa, nlhuko ya pankreasi, ferve ni osoma miri.',
        'Adesão ti GAAM — 6-12 athu mwa ovaraka, mwa mahina. MedWallet MZ vasya lembrete WhatsApp + push, khaahimya ohiwa.',
      ],
      tsonga: [
        'Mozambique una na 2,4 wa timiliyoni wa vanhu va nga na VIH. Hulumende u nyika ARV xa ximunghana.',
        'TLD yi fanela ku nwiwa nkarhi hinkwawo. Ku tshika ku pfumala ku endla resistance.',
        'Carga viral yi lavisisiwa 6 tinhwili. Undetectable = U nga pfuni ku fambanisa.',
        'Vitiomi: nhlohlo, ku vava, ku khoma nhloko.',
        'Adherence yi pfunisiwa hi GAAM.',
      ],
      changana: [
        'Mozambique una na 2,4 wa timiliyoni wa vanhu va nga na VIH. Hulumende u nyika ARV xa ximunghana.',
        'TLD yi fanela ku nwiwa nkarhi hinkwawo. Ku tshika ku pfumala ku endla resistance.',
        'Carga viral yi lavisisiwa 6 tinhwili. Undetectable = U nga pfuni ku fambanisa.',
        'Swihombe: nhlohlo, ku vava, ku khoma nhloko.',
        'Adherence yi pfunisiwa hi GAAM.',
      ],
      sena: [
        'Mozambique wako na 2,4 miliyoni wa anthu nao na VIH. Boma wupata ARV wa bwerera.',
        'TLD afana kupezwedwa nthawi yose. Kupota kubvira kupanga resistance.',
        'Carga viral yapezwa 6 milungu. Undetectable = Utapanda kudutsiza.',
        'Utaji: khoho, wudhinya, khoho ya mutu.',
        'Adesão yaphunzilidwa GAAM.',
      ],
    },
  },
  {
    id: 'nutricao-crianca-1000-dias',
    title: {
      pt: 'Nutrição infantil: os primeiros 1000 dias',
      emakhuwa: 'Muryo wa axinama: mahiku 1000 yopacerya',
      tsonga: 'Kudya ka vana: masiku 1000 yo sungula',
      changana: 'Kudya ka vana: masiku 1000 yo sungula',
      sena: 'Chakudya cha ana: masiku 1000 aoyamba',
    },
    category: 'nutricao',
    minutesRead: 4,
    icon: HeartPulse,
    color: 'bg-orange-100 text-orange-700',
    excerpt: {
      pt: 'Da concepção aos 2 anos, a nutrição define o resto da vida. Saiba o que comer e o que evitar.',
      emakhuwa: 'Mwa nthawi ya eliwa mpakha mahiku 2, muryo waavaha nlhuko. Wixihi muryo ni ohipha.',
      tsonga: 'Kusungula ku belekiwa kufika e malembe ya 2, kudya ku boxa ntirho wa munhu.',
      changana: 'Kusungula ku belekiwa kufika e malembe ya 2, kudya ku boxa ntirho wa munhu.',
      sena: 'Kuchokera kuomba kufika paaka 2, chakudya chikumusonkhola.',
    },
    body: {
      pt: [
        'Os primeiros 1000 dias — desde a concepção até aos 2 anos de idade — são a janela crítica para o desenvolvimento físico e cognitivo. A desnutrição neste período causa danos IRREVERSÍVEIS: baixa estatura adulta, QI reduzido em 10 pontos, maior risco de doenças crónicas na vida adulta.',
        'Durante a gravidez, a mãe precisa de 300 calorias extra/dia, ferro (60mg), ácido fólico (400μg), cálcio e iodo. Em Moçambique, distribui-se gratuitamente ferro + ácido fólico nas consultas pré-natais. Alimentos a privilegiar: peixe, ovo, feijão, amendoim, folhas verdes, manga, mamão.',
        'Aleitamento materno EXCLUSIVO até aos 6 meses — sem água, sem chá, sem outros alimentos. O leite materno tem tudo o que o bebé precisa, incluindo anticorpos que o protegem de diarreias e pneumonias (maiores causas de morte infantil em Moçambique).',
        'A partir dos 6 meses, introduzir alimentação complementar: papas de farinha de milho/fécula com óleo e amendoim moído, puré de banana/manga, ovo cozido, peixe desfiado. Mínimo 3 refeições/dia a partir dos 8 meses. Continuar aleitamento até aos 24 meses.',
        'Sinais de desnutrição aguda que exigem ida ao hospital: peso baixo para a altura, edema bilateral nos pés (kwashiorkor), perda de apetite, apatia. O tratamento é gratuito com Plumpy\'Nut (RUTF) nas unidades sanitárias.',
      ],
      emakhuwa: [
        'Mahiku 1000 yopacerya — mwa nthawi ya eliwa mpakha 2 mahiku — etthu yootela. Ohukhumela ya muryo vamwarya ohiveriwa: wixuttiha, QI ohipattha 10, ohupa ya atthu oolavulela.',
        'Mwa eliwali, mahiya vahaava 300 calorias, ferro (60mg), ácido fólico (400μg), cálcio, iodo. MISAU vahaava ferro + ácido fólico. Muryo: ehopa, ekuku, muxeeri, amendoim, maxunwa, manga, papaya.',
        'M\u2019paasi yuupattha 6 mahiku — KHAMOSA mati, chá, muryo. M\u2019paasi vahaava sotheene ni anticorpos yotela atthu ohupa diarreia ni pneumonia.',
        'Mwa 6 mahiku, muryo ohiva: papas ya muhuku, banana, manga, ekuku, ehopa. Miloko 3 mwa mahiku 8. M\u2019paasi vamwarya mpakha 24 mahiku.',
        'Atthu oolavulela: nlhuku wa ohupi, ohipha mahá, ohipha nlhuko, vahasulu. Mutthunelo xahala Plumpy\'Nut m\u2019kiliniku.',
      ],
      tsonga: [
        'Masiku 1000 yo sungula — ku sungula kubelekiwa kufika eka malembe ya 2 — i nkarhi lowu boxaka.',
        'Eka ku khomba, mana wa lava matimba yo engeta, xitshuri, folic, calcium, iodine.',
        'Ku tlhela ka bebe n\'wana hi susu ku fikela 6 tinhwili.',
        'Ku suka 6 tinhwili, ku thoma ku pamba swakudya.',
        'Vitiomi bya xihatla: ku tlula mpimo wa ku ringeta, ku fufuma ka milenge.',
      ],
      changana: [
        'Masiku 1000 yo sungula — ku sungula kubelekiwa kufika eka malembe ya 2 — i nkarhi lowu boxaka.',
        'Eka ku khomba, mana wa lava matimba yo engeta, xitshuri, folic, calcium, iodine.',
        'Ku tlhela ka bebe n\'wana hi susu ku fikela 6 tinhwili.',
        'Ku suka 6 tinhwili, ku thoma ku pamba swakudya.',
        'Swihombe swa xihatla: ku tlula mpimo wa ku ringeta, ku fufuma ka milenge.',
      ],
      sena: [
        'Masiku 1000 aoyamba — kuchokera kuomba kufika paaka 2 — nthawi yakukhumba.',
        'M\u2019ulimi, mayo afuna mphamvu wochunjira, chitsulo, folic, calcium, iodine.',
        'Khomera mwana paaka 6 mwezi.',
        'Kuchokera 6 mwezi, kuthamangira chakudya china.',
        'Utaji wau luka: kunyozela thupi, kuvimba thodo.',
      ],
    },
  },
  {
    id: 'hipertensao-diabetes-cronicos',
    title: {
      pt: 'Hipertensão e Diabetes: doenças crónicas em Moçambique',
      emakhuwa: 'Hipertensão ni Diabetes: atthu oopatthani Moçambique',
      tsonga: 'Hipertensão ni Diabetes: vuvabyi bya nkarhi wo leha',
      changana: 'Hipertensão ni Diabetes: vuvabyi bya nkarhi wo leha',
      sena: 'Hipertensão ni Diabetes: vuvabi wa nthawi yaitali',
    },
    category: 'cronico',
    minutesRead: 5,
    icon: Brain,
    color: 'bg-purple-100 text-purple-700',
    excerpt: {
      pt: '1 em cada 3 moçambicanos adultos tem hipertensão. Saiba como prevenir, detectar e tratar.',
      emakhuwa: '1 mwa 3 atthu ya Moçambique na hipertensão. Wixihi ovaraka, ooneha ni mutthunelo.',
      tsonga: '1 eka 3 wa vanhu va Mozambique una na hipertensão. Tlhela u vona ku sivela, ku lava, na ku tlhavela.',
      changana: '1 eka 3 wa vanhu va Mozambique una na hipertensão. Tlhela u vona ku sivela, ku lava, na ku tlhavela.',
      sena: '1 pa 3 wa anthu a Mozambique nao na hipertensão. Tsoni kusivirila, kupeza, na mutthanilo.',
    },
    body: {
      pt: [
        'As doenças crónicas não-transmissíveis (DCNT) — hipertensão, diabetes, doenças cardiovasculares e cancro — são hoje a principal causa de mortalidade em Moçambique, ultrapassando já as doenças infecciosas. A hipertensão afecta 33% dos adultos urbanos e 18% dos rurais; o diabetes tipo 2 afecta 6% e cresce 8% ao ano.',
        'A hipertensão é SILENCIOSA — a maioria não tem sintomas até ter um AVC (acidente vascular cerebral) ou enfarte. Por isso, é essencial medir a pressão pelo menos 1 vez por ano após os 40 anos, e a cada 6 meses se há história familiar. Valores normais: <130/80 mmHg. Valores alterados: ≥140/90 mmHg.',
        'Sinais de alarme que exigem ida IMEDIATA ao hospital: dor de cabeça intensa com visão turva, dor no peito que irradia para o braço esquerdo, fraqueza súbita de um lado do corpo, dificuldade de falar, perda de consciência. Estes são sinais de AVC ou enfarte — cada minuto conta.',
        'O diabetes apresenta os "3 Ps": Polidipsia (muita sede), Poliúria (muita urina), Polifagia (muita fome) — acompanhados de perda de peso inexplicada. A glicemia em jejum normal é <100 mg/dL; diabetes é ≥126 mg/dL. O tratamento inclui dieta, exercício, e medicação (Metformina primeira linha, gratuita no SNS).',
        'Prevenção comum a ambas: reduzir sal para <5g/dia (1 colher de chá), evitar fritos e ultraprocessados, comer 5 porções de fruta/vegetais por dia, caminhar 30 min/dia, NÃO fumar, moderar álcool, dormir 7-8h/noite, controlar o stress. Pequenos hábitos reduzem o risco em 80%.',
      ],
      emakhuwa: [
        'DCNT — hipertensão, diabetes, atthu ya m\u2019mutthu ni kanjuru — etthu yootela Moçambique. Hipertensão 33% axilipa urbanos, 18% rurais; diabetes 6% ni vamwarya 8% mwa mahina.',
        'Hipertensão ti SILENCIOSA — atthu makina khanii, masi yuupattha AVC wala enfarte. Wothatu, pwésa mahiku motheene 40 mahiku, ni nthano yohukhumwa. Normal: <130/80. Alterada: ≥140/90.',
        'Atthu oolavulela: nlhuko ya mutthu ni ohiweha, nlhuko ya matthu ya wixuttiha mwa axilo, ohihona mutthu mwa nthlana, wixuttiha ohipattha, ohivera nlhuko. Atthu ya AVC wala enfarte — masiha mwa masiha.',
        'Diabetes "3 Ps": vamwarya ya mati, vamwarya ya muxexe, vamwarya ya muryo — ni ohiiwa nlhuku. Glicemia ya xahala <100; diabetes ≥126. Mutthunelo: muryo, ovinya, ni mutthunelo (Metformina, xahala).',
        'Ovaraka: sava <5g/dia, ohipha ekaruma, matuwani ni maxunwa 5 mwa mahiku, ovinre 30 min, KHAMOSA suta, ovaraka ekaruma, etthu 7-8h. Vamwarya ohiveriwa 80%.',
      ],
      tsonga: [
        'DCNT i nchumu lowu dlayaka swinene e Mozambique. Hipertensão yi khoma 33% wa vanhu va madoroba.',
        'Hipertensão i xitshomiso — vitiomi byi ta endliwa ntsena loko ku ri ni AVC.',
        'Vitiomi bya xihatla: nhlohlo, ku vava mbilu, ku tlulela ka xiringa.',
        'Diabetes yi na 3 P: ku nwa mati yo tala, ku hlongola, ku dya swinene.',
        'Ku sivela: 5g wa muncu, ku dya swakudya swo tala, ku famba 30 min.',
      ],
      changana: [
        'DCNT i nchumu lowu dlayaka swinene e Mozambique. Hipertensão yi khoma 33% wa vanhu va madoroba.',
        'Hipertensão i xitshomiso — vitiomi byi ta endliwa ntsena loko ku ri ni AVC.',
        'Vitiomi bya xihatla: nhlohlo, ku vava mbilu, ku tlulela ka xiringa.',
        'Diabetes yi na 3 P: ku nwa mati yo tala, ku hlongola, ku dya swinene.',
        'Ku sivela: 5g wa muncu, ku dya swakudya swo tala, ku famba 30 min.',
      ],
      sena: [
        'DCNT i nchumu wau dlaya chomene m\u2019Mozambique. Hipertensao kuwamwa 33% wa anthu a m\u2019matao.',
        'Hipertensao i chetego — utaji utawoneka po pa AVC.',
        'Utaji wau luka: khoho, wudhinya mtima, kuwa chenecha.',
        'Diabetes na 3 P: kunwa madzi ngapo, kunyozelwa, kudya chomene.',
        'Kusivirila: 5g wa mchere, kudya chakudya chinji, kuyenda 30 min.',
      ],
    },
  },
];

const LANG_LABELS: Record<Lang, { label: string; flag: string }> = {
  pt: { label: 'Português', flag: '🇲🇿' },
  emakhuwa: { label: 'Emakhuwa', flag: '🗣️' },
  tsonga: { label: 'Xitsonga', flag: '🗣️' },
  changana: { label: 'Changana', flag: '🗣️' },
  sena: { label: 'Sena', flag: '🗣️' },
};

const CATEGORIES = [
  { key: 'all', label: 'Todos', icon: BookOpen },
  { key: 'malaria', label: 'Malária', icon: Bug },
  { key: 'tb', label: 'Tuberculose', icon: Stethoscope },
  { key: 'materna', label: 'Saúde Materna', icon: Baby },
  { key: 'arv', label: 'VIH/ARV', icon: Pill },
  { key: 'nutricao', label: 'Nutrição', icon: HeartPulse },
  { key: 'cronico', label: 'Doenças Crónicas', icon: Brain },
];

export default function HealthEducationHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lang, setLang] = useState<Lang>('pt');
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Article | null>(null);

  const filtered = useMemo(() => {
    return ARTICLES.filter((a) => {
      const matchesCat = category === 'all' || a.category === category;
      const matchesSearch = !search || a.title.pt.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [category, search]);

  const handleReadMore = (article: Article) => {
    setSelected(article);
    if (!user) {
      toast.info('Crie conta grátis para guardar progresso e receber lembretes', {
        description: 'Leva 30 segundos — sem cartão.',
        duration: 6000,
      });
    }
  };

  return (
    <>
      <Seo
        title="Educação em Saúde — MedWallet MZ"
        description="Artigos de saúde gratuitos em Português, Emakhuwa, Xitsonga, Changana e Sena. Validados por protocolos MISAU/OMS."
        path="/health/education"
      />
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-8 w-8 shrink-0" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold leading-tight">Educação em Saúde</h1>
              <p className="mt-1 text-sm text-emerald-50">
                Artigos MISAU/OMS · 100% gratuito · em 5 línguas moçambicanas
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs bg-white/20 rounded-full px-3 py-1">
              <Languages className="h-3 w-3" /> {ARTICLES.length} artigos
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto no-h-scrollbar pb-1">
          <span className="text-xs text-muted-foreground shrink-0">Língua:</span>
          {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition',
                lang === l
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {LANG_LABELS[l].flag} {LANG_LABELS[l].label}
            </button>
          ))}
        </div>

        {/* Search + category filter */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar artigo..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-h-scrollbar pb-1">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                    category === c.key
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-3 w-3" /> {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles grid */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((article) => {
            const Icon = article.icon;
            return (
              <Card
                key={article.id}
                className="lift-on-hover cursor-pointer border-border/60"
                onClick={() => handleReadMore(article)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn('grid h-9 w-9 place-items-center rounded-lg', article.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Clock className="h-3 w-3" /> {article.minutesRead} min
                    </Badge>
                  </div>
                  <CardTitle className="text-sm leading-snug mt-2 line-clamp-2">
                    {article.title[lang]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {article.excerpt[lang]}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                    Ler mais <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-10 text-center text-muted-foreground">
            <BookOpen className="mx-auto h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhum artigo encontrado para "{search}".</p>
          </div>
        )}

        {/* Quiz CTA */}
        <Card className="mt-8 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-900">Teste os seus conhecimentos</h3>
                <p className="text-xs text-emerald-800">
                  Faça quizzes de saúde e ganhe Pulse points (em breve disponível).
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-300 text-emerald-700"
                onClick={() => navigate('/recompensas')}
              >
                <Sparkles className="mr-1 h-3 w-3" /> Pulse
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Article modal */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-end md:place-items-center p-0 md:p-4"
              onClick={() => setSelected(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-white w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Clock className="h-3 w-3" /> {selected.minutesRead} min
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {LANG_LABELS[lang].label}
                    </Badge>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-full p-2 hover:bg-muted"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
                <article className="px-5 py-5">
                  <h2 className="text-xl font-bold leading-tight text-emerald-900">
                    {selected.title[lang]}
                  </h2>
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    {selected.excerpt[lang]}
                  </p>
                  <div className="mt-4 space-y-4">
                    {selected.body[lang].map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-foreground/90">
                        {p}
                      </p>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900">
                      <strong>Importante:</strong> Este conteúdo é educativo. Em caso de sintomas,
                      procure sempre uma unidade sanitária. Use o botão{" "}
                      <button
                        onClick={() => navigate('/health/triage')}
                        className="underline font-medium"
                      >
                        Triagem IA
                      </button>{" "}
                      para uma avaliação inicial.
                    </p>
                  </div>
                  {!user && (
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => navigate('/auth')}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Criar conta grátis
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        30 dias Premium grátis · sem cartão
                      </span>
                    </div>
                  )}
                </article>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
