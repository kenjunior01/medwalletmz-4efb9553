/**
 * WhatsApp helper — funciona SEM API Business.
 *
 * Em vez de integrar a WhatsApp Business Cloud API (que requer Meta Business
 * Account, template approval, etc.), usamos o esquema `wa.me` que abre o
 * WhatsApp do utilizador com a mensagem pré-preenchida. Funciona em:
 *   - Mobile (abre app nativa)
 *   - Desktop (abre WhatsApp Web)
 *
 * Para envios em massa / automatizados, o gestor pode copiar a mensagem
 * gerada e colar numa lista de difusão do WhatsApp Business.
 */

/** Normaliza número para formato internacional (apenas dígitos, com país). */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  let s = raw.replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  // Moçambique: 8XXXXXXXX → 2588XXXXXXXX
  if (s.length === 9 && s.startsWith('8')) s = '258' + s;
  // Brasil: 9XXXXXXXX → 55...
  if (s.length === 11 && s.startsWith('9')) s = '55' + s;
  return s;
}

/** Gera URL wa.me para abrir o WhatsApp com mensagem pré-preenchida. */
export function whatsappUrl(phone: string, message: string): string {
  const p = normalizePhone(phone);
  const m = encodeURIComponent(message || '');
  return `https://wa.me/${p}?text=${m}`;
}

/** Abre o WhatsApp do utilizador com a mensagem. */
export function openWhatsApp(phone: string, message: string): void {
  const url = whatsappUrl(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Constrói mensagem de lembrete ARV padronizada. */
export function buildArvReminder(opts: {
  patientName?: string;
  regimen?: string;
  time: 'manha' | 'noite';
  nextRefill?: string;
}): string {
  const period = opts.time === 'manha' ? '🌅 Manhã' : '🌙 Noite';
  const name = opts.patientName ? `${opts.patientName}, ` : '';
  const refill = opts.nextRefill
    ? `\n\n💊 Refill até: ${opts.nextRefill}`
    : '';
  return `*MedWallet — Lembrete ARV* ${period}\n\nOlá ${name}não te esqueças de tomar o ${opts.regimen || 'ARV'} agora.\n\n✅ Responde "TOMADO" para confirmar a toma.${refill}\n\n_Saúde é riqueza_ 🇲🇿`;
}

/** Constrói mensagem de lembrete ANC (pré-natal). */
export function buildAncReminder(opts: {
  patientName?: string;
  week?: number;
  visitNumber: number;
  dueDate?: string;
  facility?: string;
}): string {
  const name = opts.patientName ? `${opts.patientName}, ` : '';
  const week = opts.week ? ` (semana ${opts.week})` : '';
  const facility = opts.facility ? `\n🏥 Local: ${opts.facility}` : '';
  return `*MedWallet — Pré-Natal* 👶\n\nOlá ${name}está na altura da tua consulta ANC #${opts.visitNumber}${week}.${facility}\n\n📅 Data: ${opts.dueDate || 'a combinar'}\n\n✅ Responde "SIM" para confirmares a presença.`;
}

/** Constrói mensagem de lembrete TB DOT. */
export function buildTbReminder(opts: {
  patientName?: string;
  phase?: string;
  caseId?: string;
}): string {
  const name = opts.patientName ? `${opts.patientName}, ` : '';
  return `*MedWallet — TB DOT* 💊\n\nOlá ${name}está na hora da tua toma de ${opts.phase || 'TB'} (caso ${opts.caseId || '—'}).\n\n✅ Responde "TOMADO" para confirmar a toma observada.`;
}

/** Constrói mensagem de resultado de RDT malaria. */
export function buildMalariaResult(opts: {
  patientName?: string;
  result: 'positive' | 'negative';
  treatment?: string;
  facility?: string;
}): string {
  const name = opts.patientName ? `${opts.patientName}, ` : '';
  if (opts.result === 'positive') {
    return `*MedWallet — Resultado RDT* 🔴\n\nOlá ${name}o teu teste de malaria foi *POSITIVO*.\n\n💊 Tratamento: ${opts.treatment || 'Coartem (ACT)'}\n🏥 Recolher em: ${opts.facility || 'farmácia registada'}\n\n⚠ Procura cuidados médicos se tiveres febre alta, vómitos ou sonolência.`;
  }
  return `*MedWallet — Resultado RDT* 🟢\n\nOlá ${name}o teu teste de malaria foi *NEGATIVO*.\n\n✅ Continua com medidas preventivas: rede mosquiteira, repelente e cuidados com águas paradas.`;
}

/** Constrói mensagem SOS obstétrico. */
export function buildSosObstetric(opts: {
  patientName?: string;
  bloodType?: string;
  edd?: string;
  facility?: string;
  location?: string;
}): string {
  const name = opts.patientName ? `Paciente: ${opts.patientName}\n` : '';
  const blood = opts.bloodType ? `Tipo sanguíneo: ${opts.bloodType}\n` : '';
  const edd = opts.edd ? `DPP: ${opts.edd}\n` : '';
  const facility = opts.facility ? `Maternidade preferida: ${opts.facility}\n` : '';
  const loc = opts.location ? `Localização: ${opts.location}\n` : '';
  return `🚨 *SOS OBSTÉTRICO — MedWallet* 🚨\n\n${name}${blood}${edd}${facility}${loc}\nPor favor, contacte imediatamente a equipa médica de plantão.`;
}
