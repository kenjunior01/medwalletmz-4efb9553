## Roadmap Health SaaS — MoçambiApp

Transformação em hub de saúde (telemedicina + receitas digitais + farmácia integrada) em 4 fases. Esta entrega implementa a **Fase 1 completa**; as restantes ficam mapeadas para iterações futuras.

---

### Fase 1 — Estrutura base + Portal do Médico mínimo (ESTA ENTREGA)

**Backend (migração SQL)**
- Novos valores no enum `app_role`: `doctor`, `clinic`.
- Tabela `medical_specialties` (id, name, slug, icon) — seed inicial com 10 especialidades comuns.
- Tabela `doctor_profiles`: user_id, license_number, specialty_id, bio, consultation_fee, years_experience, languages[], is_verified, is_available, avatar_url.
- Tabela `patient_profiles`: user_id, date_of_birth, gender, blood_type, allergies[], chronic_conditions[], emergency_contact_name, emergency_contact_phone.
- Tabela `consultations`: id, doctor_id, patient_id, scheduled_at, duration_minutes, status (scheduled/in_progress/completed/cancelled/no_show), consultation_type (chat/video), notes, diagnosis, created_at.
- Tabela `consultation_messages`: id, consultation_id, sender_id, message, attachment_url, created_at — para o chat seguro.
- Tabela `prescriptions`: id, consultation_id, doctor_id, patient_id, status (active/dispensed/expired), expires_at, notes.
- Tabela `prescription_items`: id, prescription_id, medication_name, dosage, frequency, duration, instructions.
- RLS: médico vê só seus pacientes/consultas; paciente vê só os seus; admin vê tudo.
- Realtime habilitado em `consultations` e `consultation_messages`.
- Atualizar `handle_new_user` para criar `patient_profiles` automaticamente.

**Frontend (Fase 1)**
- `src/pages/doctor/DoctorRegister.tsx` — registo com licença + especialidade.
- `src/pages/doctor/DoctorDashboard.tsx` — agenda do dia, próximas consultas, ganhos do mês.
- `src/pages/doctor/DoctorConsultations.tsx` — lista consultas; abrir chat.
- `src/pages/doctor/DoctorPatients.tsx` — pacientes que já consultou.
- `src/pages/health/Doctors.tsx` — diretório público de médicos por especialidade.
- `src/pages/health/BookConsultation.tsx` — escolher data/hora e marcar (paciente).
- `src/pages/health/MyConsultations.tsx` — consultas do paciente.
- `src/pages/health/ConsultationChat.tsx` — chat em tempo real médico ↔ paciente (Realtime).
- `src/pages/health/HealthProfile.tsx` — paciente edita dados clínicos.
- `src/components/home/HealthCard.tsx` — novo card "Saúde" na home (mobile + desktop).
- Rotas em `App.tsx`; `RoleSelection.tsx` ganha opção "Sou Médico".

---

### Fase 2 — Receita digital + integração farmácia (futuro)
- Médico cria receita ao final da consulta (UI dedicada).
- Paciente vê receitas em `/health/prescriptions`, botão "Pedir na farmácia" pré-popula carrinho com produtos correspondentes.
- Matching `prescription_items.medication_name` ↔ `products.name` (busca fuzzy).
- Validação de receita controlada antes de checkout (flag `requires_prescription` em `products`).

### Fase 3 — Logística inteligente para saúde
- Flag `is_urgent_medical` em `orders` com prioridade no algoritmo de atribuição de driver.
- Cadeia de frio (campo `requires_cold_chain` em produtos).
- Protocolo de entrega verificada (foto + assinatura digital).

### Fase 4 — Monetização SaaS + expansão
- Planos de assinatura para médicos (Básico/Premium/Corporativo) via Stripe.
- Premium Health Pass para pacientes (entregas grátis + prioridade teleconsulta).
- Vídeo nativo (Daily.co ou similar) substituindo apenas-chat.
- Portal de clínicas (multi-médico, relatórios agregados).

---

### Secção técnica (Fase 1)

**Ficheiros novos**
- `supabase/migrations/<timestamp>_health_saas_phase1.sql`
- `src/pages/doctor/{DoctorRegister,DoctorDashboard,DoctorConsultations,DoctorPatients}.tsx`
- `src/pages/health/{Doctors,BookConsultation,MyConsultations,ConsultationChat,HealthProfile}.tsx`
- `src/components/home/HealthCard.tsx`
- `src/hooks/useDoctorProfile.ts`, `useConsultation.ts`

**Ficheiros editados**
- `src/App.tsx` — novas rotas `/health/*` e `/doctor/*`.
- `src/pages/RoleSelection.tsx` — adicionar card "Médico".
- `src/pages/Home.tsx` — inserir `HealthCard` no grid mobile + secção desktop.
- `src/components/layout/BottomNav.tsx` — eventual item "Saúde" (avaliar espaço).

**Sequência**
1. Migração SQL (enum + 7 tabelas + RLS + realtime + trigger update).
2. Páginas do paciente (Doctors, BookConsultation, MyConsultations, HealthProfile).
3. Páginas do médico (Register, Dashboard, Consultations, Patients).
4. Chat em tempo real (ConsultationChat com Supabase Realtime).
5. Integração na Home + RoleSelection + rotas.
