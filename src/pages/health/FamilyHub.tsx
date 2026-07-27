/**
 * Family Hub — Care for relatives at a distance
 *
 * Features:
 *  - Grid of family member cards (avatar, name, relationship, age, color stripe)
 *  - Add family member wizard (4-step: basics → medical → permissions → confirm)
 *  - Member detail drawer: today's medication schedule with mark-taken/skipped
 *  - Adherence summary (7-day rate)
 *  - Dashboard hero with pending/missed today + upcoming alerts
 *  - Skeleton loading, empty state, error state
 *  - WCAG 2.1 AA: focus rings, ARIA roles, keyboard nav, status announcements
 *  - i18n via useCountry()
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Heart, Pill, Clock, AlertTriangle, CheckCircle2,
  XCircle, ChevronRight, Phone, Calendar, Activity, ShieldCheck,
  Stethoscope, Syringe, Sparkles, Edit3, Trash2, X, Plus, Lock,
} from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import {
  FamilyMember, FamilyMedicationLog, Relationship,
  getFamilyMembers, addFamilyMember, updateFamilyMember, removeFamilyMember,
  getTodaySchedule, getAdherenceSummary, getFamilyDashboard,
  markMedicationTaken, markMedicationSkipped, scheduleMedicationToday,
  calculateAge, relationshipLabel, pickFamilyColor,
} from '@/services/familyHub';

type View = 'list' | 'add' | 'detail';

interface AddForm {
  full_name: string;
  relationship: Relationship;
  birth_date: string;
  gender: 'male' | 'female' | 'other' | '';
  blood_type: string;
  allergies: string;
  chronic_conditions: string;
  medications: string;
  emergency_contact: string;
  color: string;
}

const EMPTY_FORM: AddForm = {
  full_name: '',
  relationship: 'parent',
  birth_date: '',
  gender: '',
  blood_type: '',
  allergies: '',
  chronic_conditions: '',
  medications: '',
  emergency_contact: '',
  color: '#3B82F6',
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''];

const RELATIONSHIPS: Relationship[] = ['parent', 'child', 'spouse', 'sibling', 'grandparent', 'other'];

export default function FamilyHub() {
  const { t, user } = useCountry();
  const [view, setView] = useState<View>('list');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getFamilyDashboard>> | null>(null);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [formStep, setFormStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [m, d] = await Promise.all([
        getFamilyMembers(user.id),
        getFamilyDashboard(user.id).catch(() => null),
      ]);
      setMembers(m);
      setDashboard(d);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar familiares');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, color: pickFamilyColor(members.length) });
    setFormStep(0);
    setEditingId(null);
    setView('add');
  };

  const openEdit = (m: FamilyMember) => {
    setForm({
      full_name: m.full_name,
      relationship: m.relationship,
      birth_date: m.birth_date ?? '',
      gender: (m.gender ?? '') as AddForm['gender'],
      blood_type: m.blood_type ?? '',
      allergies: (m.allergies ?? []).join(', '),
      chronic_conditions: (m.chronic_conditions ?? []).join(', '),
      medications: (m.medications ?? []).join(', '),
      emergency_contact: m.emergency_contact ?? '',
      color: m.color ?? '#3B82F6',
    });
    setEditingId(m.id ?? null);
    setFormStep(0);
    setView('add');
  };

  const openDetail = (id: string) => {
    setSelectedMemberId(id);
    setView('detail');
  };

  const submitForm = async () => {
    if (!user?.id || !form.full_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Omit<FamilyMember, 'id' | 'caretaker_user_id'> = {
        full_name: form.full_name.trim(),
        relationship: form.relationship,
        birth_date: form.birth_date || undefined,
        gender: (form.gender || undefined) as FamilyMember['gender'],
        blood_type: form.blood_type || undefined,
        allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
        medications: form.medications ? form.medications.split(',').map((s) => s.trim()).filter(Boolean) : [],
        emergency_contact: form.emergency_contact || undefined,
        color: form.color,
      };
      if (editingId) {
        await updateFamilyMember(editingId, payload);
      } else {
        const created = await addFamilyMember(user.id, payload);
        // Auto-schedule today's medications if user provided them
        for (const med of payload.medications ?? []) {
          await scheduleMedicationToday(user.id, created.id!, med, '08:00').catch(() => {});
        }
      }
      await loadAll();
      setView('list');
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao guardar familiar');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(t('familyHub.confirmRemove') ?? 'Remover este familiar do seu círculo de cuidados?')) return;
    try {
      await removeFamilyMember(id, false);
      await loadAll();
      setView('list');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao remover');
    }
  };

  if (loading) return <FamilyHubSkeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('familyHub.title') ?? 'Família'}</h1>
              <p className="text-xs text-slate-500 leading-tight">{t('familyHub.subtitle') ?? 'Cuidar dos seus com amor'}</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold shadow-md hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition"
          >
            <UserPlus className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">{t('familyHub.addMember') ?? 'Adicionar'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div role="alert" className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {/* Dashboard hero */}
              {dashboard && dashboard.total_members > 0 && (
                <FamilyDashboardHero dashboard={dashboard} t={t} />
              )}

              {/* Members grid */}
              {members.length === 0 ? (
                <EmptyState onAdd={openAdd} t={t} />
              ) : (
                <section aria-labelledby="members-heading" className="mt-6">
                  <h2 id="members-heading" className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" aria-hidden />
                    {t('familyHub.members') ?? 'Familiares'} ({members.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((m, idx) => (
                      <MemberCard
                        key={m.id}
                        member={m}
                        index={idx}
                        onOpen={() => openDetail(m.id!)}
                        onEdit={() => openEdit(m)}
                        onRemove={() => handleRemove(m.id!)}
                        t={t}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Trust strip */}
              <TrustStrip t={t} />
            </motion.div>
          )}

          {view === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AddMemberWizard
                form={form}
                setForm={setForm}
                step={formStep}
                setStep={setFormStep}
                onSubmit={submitForm}
                onCancel={() => { setView('list'); setEditingId(null); }}
                saving={saving}
                isEdit={!!editingId}
                t={t}
              />
            </motion.div>
          )}

          {view === 'detail' && selectedMemberId && (
            <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <MemberDetail
                memberId={selectedMemberId}
                onBack={() => setView('list')}
                onEdit={() => {
                  const m = members.find((x) => x.id === selectedMemberId);
                  if (m) openEdit(m);
                }}
                t={t}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ---------- Dashboard hero ---------- */

function FamilyDashboardHero({ dashboard, t }: { dashboard: NonNullable<Awaited<ReturnType<typeof getFamilyDashboard>>>; t: any }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-purple-600 p-5 text-white shadow-xl overflow-hidden relative"
    >
      <div className="absolute inset-0 opacity-20" aria-hidden>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
        <div className="absolute bottom-0 -left-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" aria-hidden />
          <span className="text-sm font-medium opacity-90">{t('familyHub.todayOverview') ?? 'Resumo de hoje'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label={t('familyHub.totalMembers') ?? 'Familiares'} value={dashboard.total_members} icon={<Users className="w-4 h-4" />} />
          <StatTile label={t('familyHub.pendingToday') ?? 'Pendentes'} value={dashboard.pending_today} icon={<Clock className="w-4 h-4" />} />
          <StatTile label={t('familyHub.missedToday') ?? 'Esquecidas'} value={dashboard.missed_today} icon={<AlertTriangle className="w-4 h-4" />} />
          <StatTile label={t('familyHub.adherence') ?? 'Adesão 7d'} value={`${dashboard.avg_adherence}%`} icon={<Activity className="w-4 h-4" />} />
        </div>
        {dashboard.upcoming_alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="text-xs font-semibold opacity-90 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden /> {t('familyHub.upcoming') ?? 'Próximos'}
            </div>
            <ul className="space-y-1 text-sm">
              {dashboard.upcoming_alerts.map((a, i) => (
                <li key={i} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-1.5">
                  <span className="truncate"><strong>{a.medication_name}</strong> — {a.member_name}</span>
                  <span className="text-xs font-mono opacity-90 ml-2">{a.scheduled_time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-xs opacity-90 mb-1">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

/* ---------- Member card ---------- */

function MemberCard({ member, index, onOpen, onEdit, onRemove, t }: {
  member: FamilyMember; index: number; onOpen: () => void; onEdit: () => void; onRemove: () => void; t: any;
}) {
  const age = calculateAge(member.birth_date);
  const [adherence, setAdherence] = useState<{ rate: number; loading: boolean }>({ rate: 0, loading: true });

  useEffect(() => {
    let cancelled = false;
    getAdherenceSummary(member.id!)
      .then((a) => { if (!cancelled) setAdherence({ rate: a.adherence_rate, loading: false }); })
      .catch(() => { if (!cancelled) setAdherence({ rate: 0, loading: false }); });
    return () => { cancelled = true; };
  }, [member.id]);

  const adherenceColor = adherence.rate >= 80 ? 'text-emerald-600' : adherence.rate >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-1.5" style={{ background: member.color ?? '#3B82F6' }} aria-hidden />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm flex-shrink-0"
            style={{ background: member.color ?? '#3B82F6' }}
            aria-hidden
          >
            {member.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{member.full_name}</h3>
            <p className="text-xs text-slate-500">
              {relationshipLabel(member.relationship)}{age !== null ? ` · ${age} anos` : ''}
            </p>
          </div>
        </div>

        {member.chronic_conditions && member.chronic_conditions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {member.chronic_conditions.slice(0, 3).map((c, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-slate-600">
            <Pill className="w-3.5 h-3.5" aria-hidden />
            <span>{member.medications?.length ?? 0}</span>
          </div>
          <div className={`flex items-center gap-1 font-medium ${adherenceColor}`}>
            <Activity className="w-3.5 h-3.5" aria-hidden />
            <span>{adherence.loading ? '…' : `${adherence.rate}%`}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onOpen}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 transition"
          >
            {t('familyHub.viewSchedule') ?? 'Ver hoje'} <ChevronRight className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label={t('familyHub.edit') ?? 'Editar'}
          >
            <Edit3 className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={t('familyHub.remove') ?? 'Remover'}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* ---------- Member detail ---------- */

function MemberDetail({ memberId, onBack, onEdit, t }: { memberId: string; onBack: () => void; onEdit: () => void; t: any }) {
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [schedule, setSchedule] = useState<Awaited<ReturnType<typeof getTodaySchedule>>>([]);
  const [adherence, setAdherence] = useState<Awaited<ReturnType<typeof getAdherenceSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s, a] = await Promise.all([
        (async () => (await import('@/services/familyHub')).getFamilyMember(memberId))(),
        getTodaySchedule(memberId),
        getAdherenceSummary(memberId),
      ]);
      setMember(m);
      setSchedule(s);
      setAdherence(a);
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  const handleTaken = async (logId?: string) => {
    if (!logId) return;
    setActionLoading(logId);
    try {
      await markMedicationTaken(logId);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkipped = async (logId?: string) => {
    if (!logId) return;
    const reason = prompt(t('familyHub.skipReason') ?? 'Motivo:') ?? '';
    setActionLoading(logId);
    try {
      await markMedicationSkipped(logId, reason);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
        <div className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('familyHub.notFound') ?? 'Familiar não encontrado'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm">{t('common.back') ?? 'Voltar'}</button>
      </div>
    );
  }

  const age = calculateAge(member.birth_date);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded px-2 py-1">
        ← {t('common.back') ?? 'Voltar'}
      </button>

      {/* Profile hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5"
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0"
            style={{ background: member.color ?? '#3B82F6' }}
            aria-hidden
          >
            {member.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900">{member.full_name}</h2>
            <p className="text-sm text-slate-500">{relationshipLabel(member.relationship)}{age !== null ? ` · ${age} anos` : ''}</p>
            {member.emergency_contact && (
              <a href={`tel:${member.emergency_contact}`} className="mt-2 inline-flex items-center gap-1 text-sm text-rose-600 hover:underline">
                <Phone className="w-3.5 h-3.5" aria-hidden /> {member.emergency_contact}
              </a>
            )}
          </div>
          <button onClick={onEdit} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50" aria-label={t('familyHub.edit') ?? 'Editar'}>
            <Edit3 className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Medical quick facts */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {member.blood_type && (
            <div className="bg-red-50 rounded-lg p-2.5">
              <div className="text-xs text-red-600 font-medium">{t('familyHub.bloodType') ?? 'Tipo sanguíneo'}</div>
              <div className="font-bold text-red-700">{member.blood_type}</div>
            </div>
          )}
          {member.allergies && member.allergies.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-2.5 col-span-1 sm:col-span-2">
              <div className="text-xs text-orange-600 font-medium">{t('familyHub.allergies') ?? 'Alergias'}</div>
              <div className="font-medium text-orange-800 truncate">{member.allergies.join(', ')}</div>
            </div>
          )}
          {adherence && (
            <div className="bg-emerald-50 rounded-lg p-2.5">
              <div className="text-xs text-emerald-600 font-medium">{t('familyHub.adherence7d') ?? 'Adesão 7d'}</div>
              <div className="font-bold text-emerald-700">{adherence.adherence_rate}%</div>
            </div>
          )}
        </div>

        {member.chronic_conditions && member.chronic_conditions.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 mb-1">{t('familyHub.chronicConditions') ?? 'Condições crónicas'}</div>
            <div className="flex flex-wrap gap-1.5">
              {member.chronic_conditions.map((c, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">{c}</span>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Today's schedule */}
      <section aria-labelledby="schedule-heading" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 id="schedule-heading" className="font-semibold text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-rose-500" aria-hidden /> {t('familyHub.todaySchedule') ?? 'Medicação de hoje'}
          </h3>
          <span className="text-xs text-slate-500">{new Date().toLocaleDateString()}</span>
        </div>

        {schedule.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300" aria-hidden />
            {t('familyHub.noMedsToday') ?? 'Sem medicação agendada para hoje'}
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {schedule.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  s.status === 'taken' ? 'bg-emerald-50 border-emerald-200' :
                  s.status === 'skipped' ? 'bg-slate-50 border-slate-200' :
                  s.status === 'missed' ? 'bg-red-50 border-red-200' :
                  'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col items-center text-xs font-mono text-slate-600 w-14 flex-shrink-0">
                  <span className="font-bold text-slate-900">{s.scheduled_time}</span>
                  <StatusBadge status={s.status} t={t} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{s.medication_name}</div>
                  {s.skipped_reason && <div className="text-xs text-slate-500 truncate">"{s.skipped_reason}"</div>}
                </div>
                {s.status === 'pending' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleTaken(s.log_id)}
                      disabled={actionLoading === s.log_id}
                      className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      aria-label={t('familyHub.markTaken') ?? 'Tomado'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSkipped(s.log_id)}
                      disabled={actionLoading === s.log_id}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      aria-label={t('familyHub.markSkipped') ?? 'Saltar'}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {s.status === 'missed' && s.log_id && (
                  <button
                    onClick={() => handleTaken(s.log_id)}
                    disabled={actionLoading === s.log_id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                  >
                    {t('familyHub.markTakenLate') ?? 'Tomar agora'}
                  </button>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: any }) {
  const cfg = {
    pending: { label: t('familyHub.statusPending') ?? 'Pendente', cls: 'text-slate-500' },
    taken: { label: t('familyHub.statusTaken') ?? 'Tomado', cls: 'text-emerald-600' },
    skipped: { label: t('familyHub.statusSkipped') ?? 'Saltado', cls: 'text-slate-500' },
    missed: { label: t('familyHub.statusMissed') ?? 'Esquecido', cls: 'text-red-600' },
  }[status] ?? { label: status, cls: 'text-slate-500' };
  return <span className={`uppercase tracking-wide ${cfg.cls}`}>{cfg.label}</span>;
}

/* ---------- Add member wizard ---------- */

function AddMemberWizard({ form, setForm, step, setStep, onSubmit, onCancel, saving, isEdit, t }: {
  form: AddForm; setForm: (f: AddForm) => void;
  step: number; setStep: (n: number) => void;
  onSubmit: () => void; onCancel: () => void;
  saving: boolean; isEdit: boolean; t: any;
}) {
  const steps = [
    { label: t('familyHub.stepBasics') ?? 'Básicos', icon: Users },
    { label: t('familyHub.stepMedical') ?? 'Médico', icon: Stethoscope },
    { label: t('familyHub.stepMeds') ?? 'Medicação', icon: Pill },
    { label: t('familyHub.stepReview') ?? 'Rever', icon: ShieldCheck },
  ];

  const canProceed = () => {
    if (step === 0) return form.full_name.trim().length > 0;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-6" role="tablist" aria-label={t('familyHub.wizardSteps') ?? 'Passos'}>
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div
                role="tab"
                aria-selected={active}
                className={`flex items-center gap-2 ${active ? 'text-rose-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  active ? 'border-rose-500 bg-rose-50' : done ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                }`}>
                  {done ? '✓' : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </div>
          );
        })}
      </div>

      <motion.form
        key={step}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        onSubmit={(e) => { e.preventDefault(); step < 3 ? setStep(step + 1) : onSubmit(); }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
      >
        {step === 0 && (
          <>
            <h2 className="text-lg font-bold text-slate-900">{isEdit ? (t('familyHub.editTitle') ?? 'Editar familiar') : (t('familyHub.addTitle') ?? 'Adicionar familiar')}</h2>
            <Field label={t('familyHub.fullName') ?? 'Nome completo'} required>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('familyHub.relationship') ?? 'Relação'}>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value as Relationship })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                >
                  {RELATIONSHIPS.map((r) => <option key={r} value={r}>{relationshipLabel(r)}</option>)}
                </select>
              </Field>
              <Field label={t('familyHub.birthDate') ?? 'Data de nascimento'}>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('familyHub.gender') ?? 'Género'}>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as AddForm['gender'] })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                >
                  <option value="">—</option>
                  <option value="male">{t('familyHub.male') ?? 'Masculino'}</option>
                  <option value="female">{t('familyHub.female') ?? 'Feminino'}</option>
                  <option value="other">{t('familyHub.other') ?? 'Outro'}</option>
                </select>
              </Field>
              <Field label={t('familyHub.color') ?? 'Cor'}>
                <div className="flex gap-2">
                  {['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-bold text-slate-900">{t('familyHub.medicalInfo') ?? 'Informação médica'}</h2>
            <Field label={t('familyHub.bloodType') ?? 'Tipo sanguíneo'}>
              <select
                value={form.blood_type}
                onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              >
                {BLOOD_TYPES.map((b) => <option key={b || 'none'} value={b}>{b || '—'}</option>)}
              </select>
            </Field>
            <Field label={t('familyHub.allergiesHint') ?? 'Alergias (separadas por vírgula)'}>
              <input type="text" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                placeholder="Penicilina, Amendoim"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
            </Field>
            <Field label={t('familyHub.chronicHint') ?? 'Condições crónicas (separadas por vírgula)'}>
              <input type="text" value={form.chronic_conditions} onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })}
                placeholder="Diabetes, Hipertensão"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
            </Field>
            <Field label={t('familyHub.emergencyContact') ?? 'Contacto de emergência'}>
              <input type="tel" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                placeholder="+258 84 000 0000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-bold text-slate-900">{t('familyHub.medsTitle') ?? 'Medicação'}</h2>
            <p className="text-sm text-slate-500">{t('familyHub.medsHint') ?? 'Indique os medicamentos. Vamos agendar para hoje às 08:00 — pode ajustar depois.'}</p>
            <Field label={t('familyHub.medsList') ?? 'Medicamentos (separados por vírgula)'}>
              <textarea
                value={form.medications}
                onChange={(e) => setForm({ ...form, medications: e.target.value })}
                placeholder="Paracetamol 500mg, Losartan 50mg"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-bold text-slate-900">{t('familyHub.reviewTitle') ?? 'Revisão'}</h2>
            <dl className="divide-y divide-slate-100 text-sm">
              <ReviewRow label={t('familyHub.fullName') ?? 'Nome'} value={form.full_name} />
              <ReviewRow label={t('familyHub.relationship') ?? 'Relação'} value={relationshipLabel(form.relationship)} />
              {form.birth_date && <ReviewRow label={t('familyHub.birthDate') ?? 'Nascimento'} value={form.birth_date} />}
              {form.blood_type && <ReviewRow label={t('familyHub.bloodType') ?? 'Sanguíneo'} value={form.blood_type} />}
              {form.allergies && <ReviewRow label={t('familyHub.allergies') ?? 'Alergias'} value={form.allergies} />}
              {form.chronic_conditions && <ReviewRow label={t('familyHub.chronicConditions') ?? 'Condições'} value={form.chronic_conditions} />}
              {form.medications && <ReviewRow label={t('familyHub.meds') ?? 'Medicação'} value={form.medications} />}
              {form.emergency_contact && <ReviewRow label={t('familyHub.emergencyContact') ?? 'Emergência'} value={form.emergency_contact} />}
            </dl>
          </>
        )}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => step > 0 ? setStep(step - 1) : onCancel()}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {step > 0 ? (t('common.back') ?? 'Voltar') : (t('common.cancel') ?? 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={!canProceed() || saving}
            className="px-6 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            {saving ? '…' : step < 3 ? (t('common.next') ?? 'Próximo') : (isEdit ? (t('common.save') ?? 'Guardar') : (t('familyHub.addMember') ?? 'Adicionar'))}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 block mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 text-right">{value}</dd>
    </div>
  );
}

/* ---------- Empty / trust / skeleton ---------- */

function EmptyState({ onAdd, t }: { onAdd: () => void; t: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center mx-auto mb-4">
        <Heart className="w-10 h-10 text-rose-500" aria-hidden />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t('familyHub.emptyTitle') ?? 'Ainda não adicionou familiares'}</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
        {t('familyHub.emptyBody') ?? 'Adicione pais, filhos, cônjuges para acompanhar a medicação deles, receber alertas quando esquecem uma dose, e ter os dados médicos sempre à mão em emergências.'}
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-semibold shadow-md hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
      >
        <UserPlus className="w-4 h-4" aria-hidden /> {t('familyHub.addFirst') ?? 'Adicionar primeiro familiar'}
      </button>
    </motion.div>
  );
}

function TrustStrip({ t }: { t: any }) {
  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200">
        <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden />
        <span>{t('familyHub.trustPrivacy') ?? 'Dados privados — só você vê'}</span>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200">
        <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden />
        <span>{t('familyHub.trustAlerts') ?? 'Alertas quando alguém esquece dose'}</span>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200">
        <Syringe className="w-4 h-4 text-rose-500 flex-shrink-0" aria-hidden />
        <span>{t('familyHub.trustEmergency') ?? 'Ficha médica pronta em emergências'}</span>
      </div>
    </div>
  );
}

function FamilyHubSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="h-16 bg-slate-200 rounded-2xl animate-pulse mb-4" role="status" aria-busy="true" aria-live="polite" />
        <div className="h-32 bg-slate-200 rounded-2xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
