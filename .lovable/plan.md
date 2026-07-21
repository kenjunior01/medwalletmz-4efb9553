Vou implementar 5 blocos coordenados. Grande parte fica no backend (migrations + edge functions) e o resto em páginas React.

## 1. Reserva atómica do slot (anti-corrida)

Nova RPC `book_consultation_atomic(_slot_id, _reason, _coupon_id)` que faz tudo numa transação:

```text
UPDATE doctor_availability_slots
   SET is_booked = true
 WHERE id = _slot_id AND is_booked = false
RETURNING doctor_id, starts_at;   -- se 0 linhas, aborta
```

Depois:
- valida saldo (`ensure_wallet` + `SELECT ... FOR UPDATE`),
- cria `consultations`,
- chama `pay_service` (débito + cupão + comissão),
- liga `slot.consultation_id`.

Se qualquer passo falhar → rollback automático → slot volta a `is_booked=false`.

`BookConsultation.tsx` deixa de fazer 3 chamadas separadas e passa a chamar só esta RPC.

## 2. Consulta auto-completed quando o médico sai

Nova RPC `mark_consultation_completed(_id)` (SECURITY DEFINER, valida `auth.uid()==doctor_id`).

No `VideoConsultation.tsx`, no evento `left-meeting`, se `is_owner` (médico) → chamar a RPC. O trigger existente `create_followup_on_complete` cria o follow-up automaticamente.

## 3. PDF de receita com assinatura/validação

**Backend:**
- Coluna nova em `prescriptions`: `verification_code text unique` (8 chars, gerada por trigger `gen_random_bytes`).
- Coluna `signature_hash text` — SHA-256 de `id|doctor_id|patient_id|created_at|items_json` (calculada no cliente e guardada; qualquer alteração invalida-a).
- Página pública `/verify/prescription/:code` que faz `SELECT` público limitado (doctor name, patient initials, meds count, emitted date, expires_at, status) usando RPC `verify_prescription(_code)`.

**Frontend:**
- Lib nova `src/lib/prescriptionPdf.ts` usando `jspdf` + `qrcode` → gera folha A4 com cabeçalho MedWallet, dados do médico (nome, licença), paciente, tabela de medicamentos, notas, QR code que aponta para `/verify/prescription/<code>`, rodapé com hash de validação.
- Botão "Baixar PDF" em `PrescriptionDetail.tsx` e `MyPrescriptions.tsx`.
- Mensagem no chat da consulta passa a incluir link "Ver receita" (já existe) + emitir toast com botão de download.

## 4. Pagamentos M-Pesa: comprovativo + confirmação

Já existe `mpesa_manual_payments`. Falta:
- Adicionar colunas: `proof_url text`, `user_id uuid`, `wallet_tx_id uuid` (para creditar carteira quando confirmado).
- Bucket privado novo `mpesa-proofs` (upload por dono, leitura por admin/country_manager + dono).
- Página `Wallet.tsx` → botão "Depositar via M-Pesa" abre formulário: valor, número que pagou, ID da transacção M-Pesa, upload do comprovativo. Cria linha `pending` em `mpesa_manual_payments`.
- Página nova `admin/AdminMpesaConfirmations.tsx` para admin/country_manager verem pendentes, ver o comprovativo, confirmar/rejeitar. Ao confirmar chama RPC `confirm_mpesa_payment(_id)` que credita a wallet via `wallet_deposit`.
- Notificação toast ao utilizador quando confirmado (via Realtime na tabela).

## 5. Sistema de avaliações + ranking

**Backend — tabela unificada nova:**
```
institution_reviews(
  id, entity_type text,          -- 'clinic'|'hospital'|'pharmacy'|'laboratory'|'veterinary'|'doctor'
  entity_id uuid,                -- FK lógico (não físico, porque aponta para várias tabelas)
  user_id uuid, rating int 1-5, comment text, order_id uuid?, consultation_id uuid?,
  created_at, updated_at, unique(user_id, entity_type, entity_id, coalesce(order_id, consultation_id))
)
```
RLS: leitura pública; INSERT/UPDATE só dono; validação por trigger de que o utilizador teve interação real (consulta concluída, ordem paga, etc. — soft, aviso apenas).

Trigger `update_institution_rating` mantém `avg_rating` e `reviews_count` nas tabelas destino (`clinics`, `hospitals`, `pharmacies`, `laboratories`, `veterinary_clinics`, `stores`) — colunas adicionadas se faltarem.

**Frontend:**
- Componente `<RateInstitutionDialog entityType entityId />` reutilizável, chamado após ordem entregue (Orders) e após visita a `FacilityDetail`.
- Depois da consulta terminar, mostra dialog `ReviewModal` (já existe) para o médico → grava em `doctor_reviews`.
- Página nova `/ranking` com abas: Médicos / Farmácias / Hospitais / Clínicas / Laboratórios / Veterinárias. Ordenado por `avg_rating DESC, reviews_count DESC` com filtro por país. Link no menu do cliente.
- Em cada `FacilityDetail` / `StoreDetail` / perfil de médico: mostrar média + últimas 5 opiniões.

## Detalhes técnicos

- **Migrations** (uma só para juntar): novas RPCs, `verification_code`/`signature_hash`, `institution_reviews`, colunas de ranking, colunas em `mpesa_manual_payments`, bucket via `storage_create_bucket`.
- **Novos ficheiros**: `src/lib/prescriptionPdf.ts`, `src/pages/VerifyPrescription.tsx`, `src/components/reviews/RateInstitutionDialog.tsx`, `src/pages/Ranking.tsx`, `src/pages/admin/AdminMpesaConfirmations.tsx`, `src/components/wallet/MpesaDepositDialog.tsx`.
- **Ficheiros editados**: `BookConsultation.tsx`, `VideoConsultation.tsx`, `PrescriptionDetail.tsx`, `MyPrescriptions.tsx`, `Wallet.tsx`, `App.tsx` (novas rotas), `config/navigation.ts` (ranking + confirmações M-Pesa para admin).
- **Dependências novas**: `jspdf`, `jspdf-autotable`, `qrcode` (leves, ~250kb totais).

## Ordem de execução

1. Migration única com colunas + RPCs + tabela `institution_reviews` + bucket.
2. Frontend: PDF + reserva atómica + auto-complete.
3. Frontend: M-Pesa dialog + admin de confirmações.
4. Frontend: Ranking + `RateInstitutionDialog`.
5. Verificar tipos, rotas e menu.

Notificar quando pronto para revisão.
