# Plano de execução

O pedido tem muitos itens. Vou agrupar em fases para poder validar contigo antes de mexer em tudo — assim evito partir fluxos que já funcionam.

## Fase 1 — Base visual e mapas (rápido)
1. **Voltar ao Google Maps** em toda a app (substituir Mapbox/Leaflet nos componentes: `MapWidget`, `DeliveryTrackingMap`, `NearbyProvidersWidget`, etc). Usar a chave já configurada `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` com `loading=async` + callback.
2. **Ícone + logo PWA**: preciso da imagem final. Duas opções:
   - (a) gero um logo/ícone MedWallet novo (verde-esmeralda + cruz médica moderna) e aplico em `public/icon-512.png`, `public/icon.svg`, `favicon`, `manifest.webmanifest`, splash e cabeçalho.
   - (b) fazes upload da tua arte e eu aplico.

## Fase 2 — Registo de médicos + especialidades
1. Corrigir `DoctorRegister.tsx` para carregar `medical_specialties` e mostrar select (parece que a lista não está a aparecer). Verificar RLS/GRANT em `medical_specialties`.
2. Permitir múltiplas especialidades (array) e sub-especialidade livre.
3. Rebranding: **"Triagem" → "Meddy Consulta"** (proponho este, mais alinhado com o mascote Meddy). Alterar rotas visíveis, labels e cards.

## Fase 3 — Subscrições profissionais via M-Pesa/e-Mola/Mkesh
Já existe o fluxo `Subscribe.tsx` + `AdminSubscriptions.tsx` para pacientes. Vou:
1. Adicionar planos `target_audience='doctor'` (Básico / Pro / Premium) e `target_audience='clinic'`, `pharmacy`, `hospital`, `lab` — pagos em MZN via carteiras móveis com comprovativo.
2. Ligar `DoctorDashboard`, `ClinicDashboard`, etc. ao fluxo `/subscribe/:planId` já existente.
3. Manter **depósito de saldo** apenas para estafetas e pacientes; profissionais veem "Subscrever plano" em vez de "Depositar".
4. Guard: bloquear ações premium (aparecer no topo de pesquisas, receber consultas AI, etc.) se subscrição não está `active`.

## Fase 4 — Upload de ficheiros permissivo
1. Nos formulários (registo médico/clínica/farmácia/lab, comprovativos, receitas, exames): aceitar `image/*, application/pdf, .doc,.docx,.xls,.xlsx` até 10 MB.
2. **Remover campos "URL/link"** onde há upload direto (licenças, comprovativos, resultados de exames).
3. Buckets já existentes (`licenses`, `payment-proofs`, `lab-results`, `medical-records`) — só precisam de policies mais abertas para o dono do ficheiro.

## Fase 5 — Entregas opcionais + sincronização triagem AI
1. **Remover exibição de "taxa de entrega"** por defeito nas listagens de farmácias/lojas. Só mostrar se `store.delivery_enabled = true` (novo campo, default `false`). Admin ativa em massa via `AdminStores`.
2. Migration: `ALTER TABLE stores ADD COLUMN delivery_enabled boolean DEFAULT false`.
3. **Meddy Consulta (AI)**: quando a IA sugere ação, cruzar com `doctors` + `clinics` + `pharmacies` + `labs` da cidade do utilizador (via `LocationContext`) e devolver os 3 mais próximos / melhor avaliados. Já existe `ai-triage` edge function — vou expandir o prompt e a resposta com estas recomendações.

## Fora do plano (pergunto se queres depois)
- Refinar UI do BottomNav flutuante (Fase 4 anterior).
- Mapa vivo na Home + social proof.

---

**Preciso da tua confirmação em 2 pontos antes de começar:**
1. Logo PWA — gero eu (opção a) ou vais enviar arte?
2. Nome final: **"Meddy Consulta"** (recomendo) ou "Consultas Aí"?

Se disseres "força" sem responder, assumo: (a) gero o logo, e uso **"Meddy Consulta"**. Avanço fase a fase e reporto no fim de cada uma.
