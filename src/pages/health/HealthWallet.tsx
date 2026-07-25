/**
 * HealthWallet — National Digital Health Wallet
 * 
 * Portable medical history card with:
 * - QR code for instant verification
 * - Vaccination records
 * - Allergies and conditions
 * - Blood type
 * - Current medications
 * - Emergency access
 * - PDF export
 * - Share with doctor functionality
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  QrCode,
  Download,
  Share2,
  AlertCircle,
  Droplets,
  Pill,
  FileText,
  Activity,
  Shield,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Scan,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HealthRecord {
  id: string;
  type: 'vaccination' | 'allergy' | 'condition' | 'medication' | 'lab_result' | 'consultation';
  name: string;
  details: string;
  date: string;
  status: 'active' | 'completed' | 'expired';
  source: string;
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_RECORDS: HealthRecord[] = [
  {
    id: 'v1', type: 'vaccination', name: 'COVID-19 (3a dose)',
    details: 'Comirnaty/Pfizer-BioNTech - Lote EW0182', date: '2024-03-15',
    status: 'active', source: 'Hospital Central de Maputo',
  },
  {
    id: 'v2', type: 'vaccination', name: 'BCG',
    details: 'Tuberculose - Dado ao nascimento', date: '1990-01-15',
    status: 'completed', source: 'CS Urbano',
  },
  {
    id: 'v3', type: 'vaccination', name: 'Febre Amarela',
    details: 'Dose de reforco - Valido 10 anos', date: '2022-06-20',
    status: 'active', source: 'Centro de Saude',
  },
  {
    id: 'a1', type: 'allergy', name: 'Penicilina',
    details: 'Reacao alergica moderada - Urticaria', date: '2018-05-10',
    status: 'active', source: 'AlergologiaHCM',
  },
  {
    id: 'a2', type: 'allergy', name: 'Latex',
    details: 'Dermatite de contacto', date: '2020-01-22',
    status: 'active', source: 'Dermatologia',
  },
  {
    id: 'c1', type: 'condition', name: 'Hipertensao Arterial - Estadio I',
    details: '140/90 mmHg - Em tratamento com Losartana 50mg', date: '2021-08-05',
    status: 'active', source: 'Cardiologia',
  },
  {
    id: 'm1', type: 'medication', name: 'Losartana 50mg',
    details: '1 comprimido ao dia - Manha - Para hipertensao', date: '2024-01-15',
    status: 'active', source: 'Receita Digital',
  },
  {
    id: 'm2', type: 'medication', name: 'AAS 100mg',
    details: '1 comprimido ao dia - Protecao cardiovascular', date: '2024-01-15',
    status: 'active', source: 'Receita Digital',
  },
  {
    id: 'l1', type: 'lab_result', name: 'Hemograma Completo',
    details: 'Hb: 13.2 g/dL | Leucocitos: 7200/mm3 | Plaquetas: 245000/mm3 - Normal', date: '2024-06-10',
    status: 'completed', source: 'Laboratorio Central',
  },
  {
    id: 'l2', type: 'lab_result', name: 'Glicemia em Jejum',
    details: '95 mg/dL - Normal (< 100 mg/dL)', date: '2024-06-10',
    status: 'completed', source: 'Laboratorio Central',
  },
];

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Heart; color: string; bgColor: string }> = {
  vaccination: { label: 'Vacina', icon: Shield, color: 'text-green-600', bgColor: 'bg-green-50' },
  allergy: { label: 'Alergia', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  condition: { label: 'Condicao', icon: Activity, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  medication: { label: 'Medicacao', icon: Pill, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  lab_result: { label: 'Exame', icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  consultation: { label: 'Consulta', icon: Heart, color: 'text-teal-600', bgColor: 'bg-teal-50' },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function HealthWallet({ isDoctorView = false }: { isDoctorView?: boolean }) {
  const { country } = useCountry();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showEmergency, setShowEmergency] = useState(false);

  const patientInfo = {
    name: isDoctorView ? 'Joao Santos' : 'Maria da Silva',
    medicalId: 'MZ-HW-2024-00847',
    bloodType: 'A+',
    dob: '15/03/1990',
    country: country?.name || 'Mocambique',
    phone: '+258 84 123 4567',
    address: 'Av. Julius Nyerere, 1234, Maputo',
    emergencyContact: 'Rosa Santos - +258 84 765 4321',
    lastUpdated: '25/07/2026',
  };

  const filteredRecords = useMemo(() => {
    if (selectedType === 'all') return SAMPLE_RECORDS;
    return SAMPLE_RECORDS.filter(r => r.type === selectedType);
  }, [selectedType]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: SAMPLE_RECORDS.length };
    SAMPLE_RECORDS.forEach(r => {
      c[r.type] = (c[r.type] || 0) + 1;
    });
    return c;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Carteira Nacional de Saude
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historico medico portatil e seguro
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Share2 className="h-4 w-4" />
            Partilhar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            onClick={() => setShowEmergency(!showEmergency)}
          >
            <Phone className="h-4 w-4" />
            Emergencia
          </Button>
        </div>
      </div>

      {/* Emergency Banner */}
      {showEmergency && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-red-50 border-2 border-red-200 rounded-xl"
        >
          <h3 className="font-bold text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Informacoes de Emergencia
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Sangue:</span> <span className="font-bold text-red-700">{patientInfo.bloodType}</span></div>
            <div><span className="text-muted-foreground">Alergias:</span> <span className="font-bold text-red-700">Penicilina, Latex</span></div>
            <div><span className="text-muted-foreground">Doencas:</span> <span className="font-bold text-red-700">Hipertensao</span></div>
            <div><span className="text-muted-foreground">Medicacao:</span> <span className="font-bold text-red-700">Losartana 50mg, AAS 100mg</span></div>
            <div className="col-span-2"><span className="text-muted-foreground">Contacto Emergencia:</span> <span className="font-bold text-red-700">{patientInfo.emergencyContact}</span></div>
          </div>
        </motion.div>
      )}

      {/* Patient Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{patientInfo.name}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-red-100">
                <span>ID: {patientInfo.medicalId}</span>
                <span>{'\u2022'}</span>
                <span>{patientInfo.country}</span>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-xs">
              <Droplets className="h-3 w-3 mr-1" />
              {patientInfo.bloodType}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{patientInfo.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{patientInfo.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Actualizado: {patientInfo.lastUpdated}</span>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="mt-4 flex items-center gap-4">
            <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
              <QrCode className="h-8 w-8 text-gray-400" />
              <span className="text-[8px] text-gray-400 mt-0.5">QR Code</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Digitalizar para verificar</p>
              <p>O profissional de saude pode digitalizar este codigo para aceder ao seu historico completo.</p>
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 mt-1">
                <Scan className="h-3 w-3" />
                Gerar QR Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterTab label="Todas" count={counts.all} active={selectedType === 'all'} onClick={() => setSelectedType('all')} />
        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
          <FilterTab
            key={key}
            label={config.label}
            count={counts[key] || 0}
            active={selectedType === key}
            onClick={() => setSelectedType(key)}
          />
        ))}
      </div>

      {/* Records */}
      <div className="space-y-2">
        {filteredRecords.map((record) => {
          const config = TYPE_CONFIG[record.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-lg border hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bgColor)}>
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{record.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        record.status === 'active' ? 'text-green-600 border-green-200' :
                        record.status === 'expired' ? 'text-red-600 border-red-200' :
                        'text-gray-500 border-gray-200'
                      )}
                    >
                      {record.status === 'active' ? 'Activo' :
                       record.status === 'expired' ? 'Expirado' : 'Concluido'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{record.details}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{record.date}</span>
                    <span>{'\u2022'}</span>
                    <span>{record.source}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function FilterTab({ label, count, active, onClick }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {label}
      <span className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
        active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/10'
      )}>
        {count}
      </span>
    </button>
  );
}

export default HealthWallet;
