# Plano de Adopção Pública e Dominação — MedWallet MZ

> **Objectivo**: Tornar o MedWallet MZ a plataforma de saúde padrão em Moçambique nos próximos 24 meses, atingindo **2 milhões de utilizadores activos** (≈6,5% da população) e **cobertura em todas as 11 províncias**.

---

## 1. Diagnóstico do Mercado Moçambicano

### 1.1 Realidade demográfica e digital
| Indicador | Valor | Implicação estratégica |
|---|---|---|
| População total | ~33 milhões | Mercado massivo, mas fragmentado |
| Penetração smartphones | ~45% (2025) | Maioria urbana/jovem tem Android |
| Penetração internet móvel | ~70% | WhatsApp é o canal #1 |
| Custo médio 1GB dados | 12–18 MZN | Dados são caros → app tem de ser **lite** |
| Alfabetização digital | Baixa em zonas rurais | UI tem de ser visual + ícones |
| Línguas faladas | PT + Emakhuwa, Xitsonga, Changana, Sena, Macua, Ndau | Localização crítica |
| M-Pesa penetration | ~60% dos adultos | Pagamento móvel é padrão |
| Médicos por 1.000 hab. | 0,07 (vs OMS 2,3) | Carecimento agudo → APEs são espinha dorsal |

### 1.2 Concorrência
- **Sistema público MISAU-eSISTrack** — TB/HIV tracking, mas fragmentado, sem B2C
- **Dr. Consulta / Mocared** — marketplace de consultas, sem verticais clínicas profundas
- **WhatsApp directo com enfermeiros** — informal, sem registo clínico
- **NENHUMA plataforma integrada** com 5 verticais (APE/TB/ARV/Malária/Materna) + IA + pagamentos → **janela competitiva real**

---

## 2. Estratégia de Dominação em 4 Fases

### Fase 1 — Fundação Urbana (Meses 1–6)
**Foco**: Maputo + Matola + Beira (~5M pessoas, ~50% com smartphone)
**Meta**: 200.000 utilizadores registados, 50.000 pagantes

**Acções concretas**:
1. **Free Trial 30 dias** sem cartão — usufruim de Premium e ficam viciados
2. **Onboarding com código de referral** — cada novo utilizador entra via um APE/farmacêutico/amigo
3. **Parcerias farmácias urbanas** — 50 farmácias em Maputo/Matola exibem sticker "Aceitamos MedWallet MZ"
4. **WhatsApp Business bot** — triagem rápida, encaminha para app
5. **Embaixadores universitários** — 50 estudantes medicina UEM/UCM com Pulse points por referência

### Fase 2 — Expansão Provincial (Meses 7–12)
**Foco**: Nampula, Sofala, Zambezia, Cabo Delgado
**Meta**: 700.000 utilizadores acumulados, 150.000 pagantes

**Acções concretas**:
1. **Rede APE digital** — 1.000 APEs treinados com app gratuita (conta Pro Grátis para APEs)
2. **Parceria Direcções Provinciais de Saúde (DPS)** — Memorandos em 4 províncias
3. **Localização em 4 línguas locais** (Emakhuwa, Xitsonga, Changana, Sena) para interface e artigos de saúde
4. **Caravanas de saúde** — eventos mensais em bairros com testagem + registo MedWallet
5. **Rádio comunitária** — 30 spots/mês em 8 rádios comunitárias

### Fase 3 — Interior e Cobertura Total (Meses 13–18)
**Foco**: Zonas rurais, províncias do norte (Niassa, Cabo Delgado interior)
**Meta**: 1.500.000 utilizadores acumulados

**Acções concretas**:
1. **USSD bridge** — menu `*150*00#` para ver consultas agendadas sem smartphone
2. **SMS gateway** — lembretes ARV/TB para feature phones
3. **Modo offline completo** — sync diferido quando rede disponível
4. **Parceria ONGs** (Médicos Sem Fronteiras, FGH, EGPAF) — distribuição em clínicas móveis
5. **Certificação MISAU** — selo oficial reconhecido

### Fase 4 — Dominação e Exportação (Meses 19–24)
**Foco**: Densificação + exportação regional
**Meta**: 2.000.000+ utilizadores Moçambique, expansão piloto Malawi/Eswatini

**Acções concretas**:
1. **API pública MedWallet** — parceiros (seguradoras, hospitais) integram dados
2. **Marketplace de serviços de saúde** — 3ª parte oferece serviços sobre a plataforma
3. **White-label para ONGs** — versão customizável
4. **Piloto regional** — adaptação para Malawi (inglês + Chichewa)

---

## 3. Canais de Aquisição (CAC por canal)

| Canal | CAC estimado | Volume mensal | Notas |
|---|---|---|---|
| Referral orgânico (WhatsApp) | 5–15 MZN | 30.000 | Mais barato, viral após critical mass |
| APEs comunitários | 25–40 MZN | 8.000 | Alta retenção (LTV alto) |
| Rádio comunitária | 8–20 MZN | 15.000 | Massivo alcance rural |
| Facebook/Instagram ads | 35–60 MZN | 10.000 | Geo-Maputo + Beira |
| Stickers farmácias | 12–18 MZN | 5.000 | Conversão alta in-store |
| Caravanas de saúde | 50–80 MZN | 2.000 | Mais caro mas gera confiança |
| Embaixadores universitários | 20–30 MZN | 4.000 | Bônus Pulse + certificado |
| TV (TVM, STV, TV Miramar) | 80–150 MZN | 6.000 | Apenas Fase 2+ quando há orçamento |

**CAC médio ponderado-alvo**: 28 MZN (~US$0,44) → mais barato que M-Pesa (~US$3 para activar cliente) por que o benefício em saúde é evidente.

---

## 4. Alavancas de Aceitação Pública (já implementadas nesta release)

### 4.1 Free Trial 30 dias sem cartão ✅
- Todo novo utilizador Premium recebe 30 dias grátis
- Sem necessidade de M-Pesa no onboarding (cartão só no fim do trial)
- Reduz barreira de entrada psicológica

### 4.2 PWA Installable ✅
- Instalação directa do navegador (sem Google Play / App Store)
- Poupa dados móveis (download ~3MB vs 30MB APK)
- Funciona em Android 5+ (cobertura >95% dispositivos MZ)

### 4.3 Hub de Educação em Saúde Gratuito ✅
- Artigos MISAU/OMS em PT + 4 línguas locais
- Vídeos curtos <2MB cada
- Drive tráfico orgânico via Google Search ("sintomas malária Moçambique")
- **Sem paywall** — gateway de aquisição

### 4.4 Dashboard de Impacto Público ✅
- Transparência total: # utilizadores, # triagens, # referências hospitalares, # vidas potencialmente salvas
- Constrói confiança pública
- Usado em relatórios a doadores / governo

### 4.5 Rede APE Pública ✅
- Mapa visível de APEs activos por província
- Mostra que plataforma é "apoiada" pela rede comunitária de saúde
- APEs ganham bónus M-Pesa por paciente registado → incentivo viral

### 4.6 Onboarding com Referral ✅
- Logo no início: "Como conheceu o MedWallet?" + campo código referral
- Atribui bónus ao referee e ao referrer (MZN + Pulse)
- Faz tracking viral K-factor semanalmente

---

## 5. Parcerias Estratégicas (target 24 meses)

### 5.1 Governo
- **MISAU** (Ministério da Saúde) — certificação oficial + integração com SIS-MA (Sistema de Informação Saúde)
- **DPS provinciais** (11) — memorandos operacionais
- **INE** (Instituto Nacional Estatística) — dados demográficos para segmentação
- **UDAPE** — alinhamento com PDDCPAN

### 5.2 Operadores
- **Vodacom Moçambique** — co-marketing M-Pesa + bundle de dados "MedWallet Zero"
- **Movitel** — bundle de dados rurais + SMS USSD
- **Tmcel** — conectividade institucional

### 5.3 ONGs e Doadores
- **Médicos Sem Fronteiras (MSF)** — adopção em Cabo Delgado
- **Family Health International (FHI360)** — programa ARV
- **EGPAF** (Elizabeth Glaser) — vertente materno-infantil
- **Global Fund** — financiamento para verticais TB/Malária/HIV
- **USAID** — programa RHINO (saúde rural)
- **Banco Mundial** — linha de crédito digital health

### 5.4 Sector Privado
- **SIVOM** (Sociedade Imp. Vel. Moçambique) — distribuição stickers farmácias
- **Farmácias Privadas de Moçambique** (associação) — rede 200+ farmácias
- **Cataratas de Moçambique** — patrocínio caravanas
- **Vodacom / Movitel** — já cobertos acima
- **Bancos comerciais** (BIM, BCI, Standard Bank) — financiamento B2B para clínicas

### 5.5 Academia
- **UEM Faculdade Medicina** — validação clínica + embaixadores
- **UCM** (Universidade Católica) — pesquisa em saúde digital
- **ISCTEM** — formação técnica

---

## 6. Métricas North-Star e KPIs

### North-Star Metric
**Utilizadores activos semanais que realizaram pelo menos 1 acção de saúde** (triagem, lembrete ARV, consulta marcada, artigo lido)

### KPIs trimestrais
| Categoria | KPI | Alvo Q1 2026 | Alvo Q4 2026 |
|---|---|---|---|
| Aquisição | Novos registos / mês | 25.000 | 150.000 |
| Activação | % que completa perfil saúde em 24h | 45% | 65% |
| Retenção | Retenção D30 | 35% | 55% |
| Receita | MRR (MZN) | 800.000 | 4.500.000 |
| Receita | ARPU mensal (MZN) | 18 | 35 |
| Saúde | Triagens IA / mês | 50.000 | 400.000 |
| Saúde | Referências hospitalares correctas | 8.000 | 75.000 |
| Pagamentos | Tx sucesso M-Pesa | 92% | 97% |
| Referral | K-factor viral | 0,4 | 0,9 |
| NPS | Net Promoter Score | 38 | 55 |

---

## 7. Estratégia de Conteúdo e Localização

### 7.1 Línguas prioritárias (24 meses)
1. **Português** — interface completa (feito)
2. **Emakhuwa** — ~26% população (Nampula, Cabo Delgado)
3. **Xitsonga** — ~12% (Gaza, Maputo província)
4. **Changana** — ~11% (Maputo, Gaza)
5. **Sena** — ~9% (Sofala, Tete, Zambézia)
6. **Macua** — variante de Emakhuwa, partilha tradução

### 7.2 Biblioteca de conteúdo gratuito
- 100+ artigos de saúde (malária, TB, HIV, gravidez, vacinação, nutrição infantil)
- 50+ vídeos <2MB cada (formas de tomar ARV, sinais de alarme gravidez, etc.)
- 20+ quizzes de saúde (gamificação → Pulse points)
- Conteúdo validado por **Conselho Clínico MZ** (médicos UEM + MISAU)

### 7.3 Programa de Embaixadores
- **APEs** — bónus 50 MZN por paciente activo D30
- **Studantes medicina** — certificado + Pulse + estágio curricular
- **Influenciadores saúde** (Dra. Celina, etc.) — contratos trimestrais

---

## 8. Estratégia de Preço Específica para Moçambique

### Princípio: "Acessível mas sustentável"
- **Plano Gratuito**: sempre disponível (triagem IA, 1 consulta/mês, artigos)
- **Plus Individual**: 199 MZN/mês ≈ US$3,10 (1,5% salário mínimo urbano)
- **Grávida**: 299 MZN/mês com 4 consultas — directamente apelativo para 1M+ grávidas/ano
- **Família**: 399 MZN/mês até 5 membros — cultura familiar africana
- **B2B Clínica Pro**: 18.000 MZN/mês — 100 médicos, viável para clínicas privadas

### Subsídios estratégicos (parcerias)
- APEs têm conta Pro **grátis** (são canal de aquisição, não cliente)
- Pacientes em programas TB/ARV do MISAU têm plano Crónico **grátis** (financiado por doadores)
- Mulheres grávidas em bairros de baixa renda têm plano Grávida **grátis** primeiro trimestre (parceria UNFPA)

---

## 9. Estratégia Anti-Churn

### 9.1 Identificação de churn precoce
- User não abre app há 7 dias → push notification "A sua última triagem foi há X dias"
- User não marca consulta há 30 dias → email + WhatsApp com médico recomendado
- Subscrevente que não usa benefícios → review automático + oferta de downgrade

### 9.2 Win-back
- Após cancelamento: 14 dias para reativar com 50% desconto primeiro mês
- Inquérito churn → oferece plano mais barato se problema for preço

### 9.3 Sticky features (aumentam switching cost)
- Histórico clínico completo (visitado por paciente)
- Receitas armazenadas
- Cartão de saúde digital (QR)
- Lembrete personalizado ARV/TB
- Vínculo com médico de família

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| MISAU rejeita certificação | Média | Alto | Diálogo precoce, conformidade RGPD-Lei 18/2004 |
| Vodacom M-Pesa API dispara custos | Alta | Médio | Manter modo manual até volume justificar API Business |
| Concorrente lança antes | Baixa | Alto | Velocidade de execução + contrato exclusivo APEs |
| Cortes de corrente frequentes | Alta | Médio | PWA offline-first + sync diferido |
| Baixa literacia digital rural | Alta | Alto | Vídeos + voice TTS + APE como tutor |
| Custo de dados | Alta | Alto | PWA lite + bundle Vodacom "MedWallet Zero" |
| Fraude M-Pesa manual | Média | Médio | Auditoria admin + ML pattern detection |
| Vazamento dados pacientes | Baixa | Crítico | Supabase RLS + auditoria trimestral + cyber insurance |

---

## 11. Roadmap 24 Meses (resumo executivo)

```
Mês 1-3  : Free Trial + PWA Install + Referral + Education Hub
Mês 4-6  : 1.000 APEs activos + 4 parcerias farmácias urbanas
Mês 7-9  : Localização Emakhuwa + Xitsonga + parcerias DPS Nampula/Sofala
Mês 10-12: USSD bridge + SMS gateway + 700k utilizadores
Mês 13-15: Certificação MISAU + integração SIS-MA
Mês 16-18: 1,5M utilizadores + cobertura nacional completa
Mês 19-21: API pública + marketplace + white-label ONG
Mês 22-24: 2M+ utilizadores + piloto Malawi
```

---

## 12. Conclusão

A combinação de **Free Trial + PWA + Referral + Educação gratuita + Transparência + Rede APE pública** cria o ciclo virtuoso:

1. **Descoberta** via rádio / farmácia / WhatsApp → user instala PWA (baixo custo dados)
2. **Onboarding** com código referral → ganha bónus +_free trial 30 dias
3. **Valor imediato** via triagem IA + artigos grátis → "wow moment" em <5 min
4. **Conversão** após trial → 199 MZN é psychological sweet spot para classe média urbana
5. **Viralidade** → user convida família (planos família), APEs convidam pacientes (bónus)
6. **Lock-in** → histórico clínico acumula, médico de família atribuído, switching cost alto
7. **Domínio** → após 500k utilizadores, MISAU tem interesse oficial, parcerias escalonam

**Esta é a diferença entre "mais uma app de saúde" e "a plataforma de saúde de Moçambique".**

---

*Documento vivo — actualizar trimestralmente com métricas reais.*
*Próxima revisão: Q1 2026*
