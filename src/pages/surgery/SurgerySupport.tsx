/**
 * Surgery Support System — Complete surgical workflow management
 * 
 * Features:
 * - Pre-surgery assessment and checklists
 * - Surgery scheduling and theater management
 * - Real-time surgery status tracking
 * - Post-operative care plans
 * - Family notification system
 * - Integration with wallet (cost estimation, payments)
 * - Integration with insurance (coverage checks)
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  format,
  addDays,
} from 'date-fns';
import {
  HeartPulse,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  FileText,
  CreditCard,
  Shield,
  Bell,
  Activity,
  ArrowRight,
  ArrowLeft,
  Phone,
  MapPin,
  Scissors,
  Stethoscope,
  ClipboardList,
  Pill,
  Timer,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SurgeryStatus =
  | 'scheduled'
  | 'pre_op_checklist'
  | 'in_progress'
  | 'completed'
  | 'post_op'
  | 'cancelled';

export type SurgeryPriority = 'elective' | 'urgent' | 'emergency';
export type SurgeryComplexity = 'minor' | 'moderate' | 'major' | 'complex';

export interface SurgeryProcedure {
  id: string;
  name: string;
  specialty: string;
  complexity: SurgeryComplexity;
  estimatedDuration: number;
  estimatedCost: number;
  currency: string;
  insuranceCoverage: number;
  requiredTests: string[];
  preOpInstructions: string[];
  postOpInstructions: string[];
}

export interface SurgeryChecklistItem {
  id: string;
  label: string;
  category: 'lab' | 'imaging' | 'consent' | 'anesthesia' | 'medical' | 'financial';
  completed: boolean;
  required: boolean;
}

export interface FamilyContact {
  name: string;
  phone: string;
  relationship: string;
  notified: boolean;
}

export interface CostBreakdown {
  procedureCost: number;
  anesthesiaCost: number;
  theaterCost: number;
  medicationCost: number;
  totalCost: number;
  insuranceCoverage: number;
  outOfPocket: number;
  currency: string;
}

export interface SurgeryAppointment {
  id: string;
  patientId: string;
  patientName: string;
  procedure: SurgeryProcedure;
  scheduledDate: string;
  scheduledTime: string;
  status: SurgeryStatus;
  priority: SurgeryPriority;
  surgeon: string;
  anesthesiologist: string;
  facility: string;
  theater: string;
  checklist: SurgeryChecklistItem[];
  notes: string;
  familyContacts: FamilyContact[];
  costBreakdown: CostBreakdown;
}

// ─── Status Configuration ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<SurgeryStatus, { label: string; color: string; bgColor: string; icon: typeof HeartPulse }> = {
  scheduled: { label: 'Agendada', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Calendar },
  pre_op_checklist: { label: 'Checklist Pre-Op', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: ClipboardList },
  in_progress: { label: 'Em Curso', color: 'text-red-700', bgColor: 'bg-red-100', icon: Activity },
  completed: { label: 'Concluida', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
  post_op: { label: 'Pos-Operatorio', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: HeartPulse },
  cancelled: { label: 'Cancelada', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: AlertTriangle },
};

const PRIORITY_CONFIG: Record<SurgeryPriority, { label: string; color: string }> = {
  elective: { label: 'Electiva', color: 'bg-green-500' },
  urgent: { label: 'Urgente', color: 'bg-amber-500' },
  emergency: { label: 'Emergencia', color: 'bg-red-500' },
};

const COMPLEXITY_CONFIG: Record<SurgeryComplexity, { label: string; stars: number }> = {
  minor: { label: 'Menor', stars: 1 },
  moderate: { label: 'Moderada', stars: 2 },
  major: { label: 'Grave', stars: 3 },
  complex: { label: 'Complexa', stars: 4 },
};

// ─── Common Procedures Database ──────────────────────────────────────────────

const COMMON_PROCEDURES: SurgeryProcedure[] = [
  {
    id: 'hernia-repair', name: 'Herniorrafia', specialty: 'Cirurgia Geral',
    complexity: 'minor', estimatedDuration: 90, estimatedCost: 15000,
    currency: 'MZN', insuranceCoverage: 80,
    requiredTests: ['Hemograma', 'Coagulacao', 'ECG'],
    preOpInstructions: ['Jejum de 8h', 'Suspender AAS 7 dias antes', 'Banho pre-operatorio'],
    postOpInstructions: ['Repouso 48h', 'Evitar esforco fisico 30 dias', 'Curativo diario'],
  },
  {
    id: 'appendectomy', name: 'Apendicectomia', specialty: 'Cirurgia Geral',
    complexity: 'moderate', estimatedDuration: 60, estimatedCost: 25000,
    currency: 'MZN', insuranceCoverage: 90,
    requiredTests: ['Hemograma', 'Urina tipo I', 'Ecografia abdominal'],
    preOpInstructions: ['Jejum de 8h', 'Soro venoso', 'Antibiotico profilatico'],
    postOpInstructions: ['Dieta liquida 24h', 'Progressao alimentar', 'Analgesia controlada'],
  },
  {
    id: 'cataract-surgery', name: 'Cirurgia de Catarata', specialty: 'Oftalmologia',
    complexity: 'minor', estimatedDuration: 30, estimatedCost: 35000,
    currency: 'MZN', insuranceCoverage: 70,
    requiredTests: ['Biomicroscopia', 'Ultrassonografia ocular', 'Medida do cristalino'],
    preOpInstructions: ['Colirios antibioticos 3 dias antes', 'Jejum 4h', 'Transporte organizado'],
    postOpInstructions: ['Evitar esforco fisico 15 dias', 'Colirios prescritos', 'Consulta 24h depois'],
  },
  {
    id: 'cesarean', name: 'Cesariana', specialty: 'Ginecologia/Obstetricia',
    complexity: 'moderate', estimatedDuration: 60, estimatedCost: 45000,
    currency: 'MZN', insuranceCoverage: 85,
    requiredTests: ['Hemograma', 'Tipagem sanguinea', 'Coagulacao', 'VIH', 'VDRL'],
    preOpInstructions: ['Jejum de 8h', 'Raspar abdomen', 'Soro venoso', 'Consentimento informado'],
    postOpInstructions: ['Deambulacao preoce', 'Amamentacao imediata', 'Analgesia', 'Cuidados com ferida'],
  },
  {
    id: 'orthopedic-plate', name: 'Osteossintese (Placa)', specialty: 'Ortopedia',
    complexity: 'major', estimatedDuration: 120, estimatedCost: 80000,
    currency: 'MZN', insuranceCoverage: 75,
    requiredTests: ['RX area afectada', 'Hemograma', 'ECG', 'Coagulacao'],
    preOpInstructions: ['Jejum 8h', 'Suspender anticoagulantes', 'Consentimento informado'],
    postOpInstructions: ['Imobilizacao', 'Fisioterapia a partir do 3o dia', 'Cuidados com pontos', 'RX controle'],
  },
  {
    id: 'cholecystectomy', name: 'Colecistectomia Laparoscopica', specialty: 'Cirurgia Geral',
    complexity: 'moderate', estimatedDuration: 90, estimatedCost: 55000,
    currency: 'MZN', insuranceCoverage: 80,
    requiredTests: ['Ecografia abdominal', 'Hemograma', 'Coagulacao', 'Funcao hepatica'],
    preOpInstructions: ['Jejum 8h', 'Dieta leve no dia anterior', 'Suspender anticoagulantes'],
    postOpInstructions: ['Dieta leve', 'Evitar esforco 15 dias', 'Analgesia', 'Retorno em 7 dias'],
  },
];

function generateChecklist(procedure: SurgeryProcedure): SurgeryChecklistItem[] {
  return [
    ...procedure.requiredTests.map((test, i) => ({
      id: `lab-${i}`, label: test, category: 'lab' as const,
      completed: false, required: true,
    })),
    { id: 'consent', label: 'Consentimento Informado', category: 'consent', completed: false, required: true },
    { id: 'anesthesia-consult', label: 'Consulta de Anestesiologia', category: 'anesthesia', completed: false, required: true },
    { id: 'medical-clearance', label: 'Liberacao Medica', category: 'medical', completed: false, required: true },
    { id: 'insurance-check', label: 'Verificacao de Seguro', category: 'financial', completed: false, required: false },
    { id: 'payment-confirm', label: 'Confirmacao de Pagamento', category: 'financial', completed: false, required: true },
  ];
}

// ─── Main Component ────────────────────────────────────────────────────────

interface SurgerySupportProps {
  patientId?: string;
  isDoctor?: boolean;
  isPatient?: boolean;
}

export function SurgerySupport({ patientId, isDoctor = false, isPatient = false }: SurgerySupportProps) {
  const { country } = useCountry();
  const currencySymbol = country?.currency_symbol || 'MT';

  const [view, setView] = useState<'dashboard' | 'procedure' | 'detail'>('dashboard');
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string | null>(null);

  const [surgeries, setSurgeries] = useState<SurgeryAppointment[]>([
    {
      id: 'surg-001',
      patientId: patientId || 'p-001',
      patientName: isPatient ? 'Maria Silva' : 'Joao Santos',
      procedure: COMMON_PROCEDURES[0],
      scheduledDate: addDays(new Date(), 5).toISOString(),
      scheduledTime: '08:00',
      status: 'pre_op_checklist',
      priority: 'elective',
      surgeon: 'Dr. Carlos Mondlane',
      anesthesiologist: 'Dr. Ana Tembe',
      facility: 'Hospital Central de Maputo',
      theater: 'Sala 3 - Piso 2',
      checklist: generateChecklist(COMMON_PROCEDURES[0]),
      notes: 'Paciente com hernia inguinal direita recorrente.',
      familyContacts: [
        { name: 'Rosa Santos', phone: '+258 84 123 4567', relationship: 'Esposa', notified: true },
        { name: 'Pedro Santos', phone: '+258 86 987 6543', relationship: 'Filho', notified: false },
      ],
      costBreakdown: {
        procedureCost: 12000, anesthesiaCost: 2000, theaterCost: 5000,
        medicationCost: 1000, totalCost: 20000, insuranceCoverage: 16000,
        outOfPocket: 4000, currency: 'MZN',
      },
    },
    {
      id: 'surg-002',
      patientId: patientId || 'p-002',
      patientName: isPatient ? 'Ana Tembe' : 'Lucia Mabunda',
      procedure: COMMON_PROCEDURES[3],
      scheduledDate: addDays(new Date(), -1).toISOString(),
      scheduledTime: '14:00',
      status: 'post_op',
      priority: 'urgent',
      surgeon: 'Dra. Fernanda Nhaca',
      anesthesiologist: 'Dr. Paulo Mondlane',
      facility: 'Hospital Geral de Maputo',
      theater: 'Sala 1 - Maternidade',
      checklist: generateChecklist(COMMON_PROCEDURES[3]).map(i => ({ ...i, completed: true })),
      notes: 'Cesariana de emergencia por sofrimento fetal.',
      familyContacts: [
        { name: 'Teresa Mabunda', phone: '+258 84 555 1234', relationship: 'Mae', notified: true },
      ],
      costBreakdown: {
        procedureCost: 30000, anesthesiaCost: 5000, theaterCost: 8000,
        medicationCost: 3000, totalCost: 46000, insuranceCoverage: 39100,
        outOfPocket: 6900, currency: 'MZN',
      },
    },
  ]);

  const selectedSurgery = selectedSurgeryId ? surgeries.find(s => s.id === selectedSurgeryId) : null;

  const toggleChecklistItem = (surgeryId: string, itemId: string) => {
    setSurgeries(prev => prev.map(s => {
      if (s.id !== surgeryId) return s;
      return {
        ...s,
        checklist: s.checklist.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      };
    }));
  };

  const notifyFamily = (surgeryId: string, contactIndex: number) => {
    setSurgeries(prev => prev.map(s => {
      if (s.id !== surgeryId) return s;
      return {
        ...s,
        familyContacts: s.familyContacts.map((c, i) =>
          i === contactIndex ? { ...c, notified: true } : c
        ),
      };
    }));
  };

  const isChecklistComplete = (surgery: SurgeryAppointment) =>
    surgery.checklist.filter(i => i.required).every(i => i.completed);

  const checklistProgress = (surgery: SurgeryAppointment) => {
    const total = surgery.checklist.length;
    const done = surgery.checklist.filter(i => i.completed).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  // ─── Dashboard View ────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Scissors className="h-5 w-5 text-red-600" />
              Apoio a Cirurgias
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gestao completa do percurso cirurgico
            </p>
          </div>
          {!isPatient && (
            <Button onClick={() => setView('procedure')} className="gap-2">
              <Plus className="h-4 w-4" />
              Agendar Cirurgia
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Agendadas" value={surgeries.filter(s => s.status === 'scheduled').length} icon={Calendar} color="blue" />
          <StatCard label="Em Curso" value={surgeries.filter(s => s.status === 'in_progress').length} icon={Activity} color="red" />
          <StatCard label="Checklist" value={surgeries.filter(s => s.status === 'pre_op_checklist').length} icon={ClipboardList} color="amber" />
          <StatCard label="Pos-Op" value={surgeries.filter(s => s.status === 'post_op').length} icon={HeartPulse} color="purple" />
        </div>

        {/* Surgery Cards */}
        <div className="space-y-3">
          {surgeries.map((surgery) => {
            const statusConfig = STATUS_CONFIG[surgery.status];
            const priorityConfig = PRIORITY_CONFIG[surgery.priority];
            const progress = checklistProgress(surgery);

            return (
              <motion.div
                key={surgery.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005 }}
                className="cursor-pointer"
                onClick={() => { setSelectedSurgeryId(surgery.id); setView('detail'); }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{surgery.procedure.name}</span>
                          <Badge className={cn('text-white text-[10px]', priorityConfig.color)} variant="secondary">
                            {priorityConfig.label}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px]', statusConfig.color, statusConfig.bgColor)}>
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            {surgery.surgeon}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {surgery.facility}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(surgery.scheduledDate), 'dd MMM yyyy')} as {surgery.scheduledTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {surgery.procedure.estimatedDuration} min
                          </span>
                        </div>

                        {surgery.status === 'pre_op_checklist' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progresso do Checklist</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold">
                          {surgery.costBreakdown.outOfPocket.toLocaleString()} {currencySymbol}
                        </div>
                        {surgery.costBreakdown.insuranceCoverage > 0 && (
                          <div className="text-[10px] text-green-600 flex items-center gap-1 justify-end">
                            <Shield className="h-3 w-3" />
                            Seguro cobre {surgery.procedure.insuranceCoverage}%
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Available Procedures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Procedimentos Disponiveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {COMMON_PROCEDURES.map(proc => {
                const complexity = COMPLEXITY_CONFIG[proc.complexity];
                return (
                  <div key={proc.id} className="p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="font-medium text-sm">{proc.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{proc.specialty}</span>
                      <span className="text-muted-foreground">{'\u2022'}</span>
                      <span>{proc.estimatedDuration} min</span>
                      <span className="text-muted-foreground">{'\u2022'}</span>
                      <span className="font-medium text-foreground">
                        {proc.estimatedCost.toLocaleString()} {currencySymbol}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Detail View ────────────────────────────────────────────────────
  if (view === 'detail' && selectedSurgery) {
    const surgery = selectedSurgery;
    const progress = checklistProgress(surgery);
    const complete = isChecklistComplete(surgery);
    const statusConfig = STATUS_CONFIG[surgery.status];

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-bold">{surgery.procedure.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn('text-xs', statusConfig.color, statusConfig.bgColor)}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {PRIORITY_CONFIG[surgery.priority].label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <InfoRow icon={Stethoscope} label="Cirurgiao" value={surgery.surgeon} />
              <InfoRow icon={Stethoscope} label="Anestesista" value={surgery.anesthesiologist} />
              <InfoRow icon={MapPin} label="Facilidade" value={surgery.facility} />
              <InfoRow icon={Clock} label="Data/Hora" value={`${format(new Date(surgery.scheduledDate), 'dd/MM/yyyy')} as ${surgery.scheduledTime}`} />
              <InfoRow icon={Timer} label="Duracao" value={`${surgery.procedure.estimatedDuration} minutos`} />
              <InfoRow icon={Scissors} label="Sala" value={surgery.theater} />
            </div>

            {surgery.notes && (
              <div className="mt-3 p-2 bg-muted rounded text-sm text-muted-foreground">
                <span className="font-medium">Observacoes: </span>{surgery.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-Op Checklist */}
        {surgery.status === 'pre_op_checklist' && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-600" />
                  Checklist Pre-Operatoria
                </CardTitle>
                <span className={cn('text-xs font-bold', complete ? 'text-green-600' : 'text-amber-600')}>
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-1.5 mt-2" />
            </CardHeader>
            <CardContent className="space-y-2">
              {surgery.checklist.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all',
                    item.completed ? 'bg-green-50 border-green-200' : 'hover:bg-accent/50'
                  )}
                  onClick={() => isDoctor && toggleChecklistItem(surgery.id, item.id)}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    item.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground/30'
                  )}>
                    {item.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-sm', item.completed && 'line-through text-muted-foreground')}>
                      {item.label}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {item.category === 'lab' ? 'Laboratorial' :
                     item.category === 'imaging' ? 'Imagiologia' :
                     item.category === 'consent' ? 'Consentimento' :
                     item.category === 'anesthesia' ? 'Anestesia' :
                     item.category === 'medical' ? 'Medico' : 'Financeiro'}
                  </Badge>
                </div>
              ))}
              {complete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-green-100 rounded-lg text-green-800 text-sm text-center font-medium"
                >
                  <CheckCircle2 className="h-5 w-5 inline mr-2" />
                  Checklist completo! A cirurgia esta pronta para prosseguir.
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cost Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Resumo de Custos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CostRow label="Procedimento" value={surgery.costBreakdown.procedureCost} currency={currencySymbol} />
            <CostRow label="Anestesia" value={surgery.costBreakdown.anesthesiaCost} currency={currencySymbol} />
            <CostRow label="Sala Operatoria" value={surgery.costBreakdown.theaterCost} currency={currencySymbol} />
            <CostRow label="Medicacao" value={surgery.costBreakdown.medicationCost} currency={currencySymbol} />
            <Separator className="my-2" />
            <CostRow label="Total" value={surgery.costBreakdown.totalCost} currency={currencySymbol} bold />
            {surgery.costBreakdown.insuranceCoverage > 0 && (
              <>
                <CostRow label="Cobertura do Seguro" value={-surgery.costBreakdown.insuranceCoverage} currency={currencySymbol} color="green" />
                <Separator className="my-2" />
                <CostRow label="Valor Proprio" value={surgery.costBreakdown.outOfPocket} currency={currencySymbol} bold color="blue" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Family Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contactos Familiares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {surgery.familyContacts.map((contact, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div>
                  <div className="text-sm font-medium">{contact.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{contact.relationship}</span>
                    <span className="text-muted-foreground">{'\u2022'}</span>
                    <span>{contact.phone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contact.notified ? (
                    <Badge variant="outline" className="text-[10px] text-green-600 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Notificado
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                      onClick={() => notifyFamily(surgery.id, i)}>
                      <Bell className="h-3 w-3" />
                      Notificar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Post-Op Instructions */}
        {(surgery.status === 'post_op' || surgery.status === 'completed') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Pill className="h-4 w-4 text-purple-600" />
                Instrucoes Pos-Operatorias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {surgery.procedure.postOpInstructions.map((instr, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <span>{instr}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Procedure Selection View ──────────────────────────────────────
  if (view === 'procedure') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <h2 className="text-lg font-bold flex items-center gap-2">
          <Scissors className="h-5 w-5 text-red-600" />
          Agendar Nova Cirurgia
        </h2>

        <div className="space-y-3">
          {COMMON_PROCEDURES.map(proc => {
            const complexity = COMPLEXITY_CONFIG[proc.complexity];
            return (
              <Card key={proc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="font-semibold">{proc.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{proc.specialty}</p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {proc.estimatedDuration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {proc.estimatedCost.toLocaleString()} {currencySymbol}
                    </span>
                    <span>
                      {Array.from({ length: complexity.stars }).map((_, i) => (
                        <span key={i}>{'\u2B50'}</span>
                      ))}
                      <span className="ml-1">{complexity.label}</span>
                    </span>
                  </div>

                  {proc.insuranceCoverage > 0 && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-[10px] text-green-600">
                        <Shield className="h-3 w-3 mr-1" />
                        Seguro cobre {proc.insuranceCoverage}%
                      </Badge>
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Exames necessarios:</p>
                    <div className="flex flex-wrap gap-1">
                      {proc.requiredTests.map((test, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{test}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: typeof HeartPulse; color: string;
}) {
  const gradients: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center', gradients[color])}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof HeartPulse; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function CostRow({ label, value, currency, bold, color }: {
  label: string; value: number; currency: string; bold?: boolean; color?: string;
}) {
  const isNeg = value < 0;
  return (
    <div className={cn('flex items-center justify-between text-sm', bold && 'font-semibold')}>
      <span className={cn(color === 'green' && 'text-green-600', color === 'blue' && 'text-blue-600')}>
        {label}
      </span>
      <span className={cn(bold && 'text-base', isNeg ? 'text-green-600' : '', color === 'blue' && 'text-blue-600')}>
        {isNeg ? '-' : ''}{Math.abs(value).toLocaleString()} {currency}
      </span>
    </div>
  );
}
