/**
 * VisionScanner — Scan prescriptions/lab results via Gemini Vision
 * Task #26
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, Upload, Loader2, Sparkles, Pill,
  FlaskConical, FileText, Syringe, Stethoscope, RefreshCw,
  CheckCircle2, AlertCircle, ChevronRight, Image as ImageIcon,
} from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  uploadScanImage, scanPrescription, scanLabResult, scanMedicineLabel,
  scanDocument, saveScan, getScans, updateScanReview,
  type ScanType, type VisionScan, type DetectedMedication, type DetectedLabResult,
} from '@/services/visionScanner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Stage = 'select' | 'uploading' | 'scanning' | 'review' | 'saved';

const SCAN_TYPES: Array<{ type: ScanType; icon: any; labelKey: string; descKey: string; color: string }> = [
  { type: 'prescription', icon: Pill, labelKey: 'visionScanner.type_prescription', descKey: 'visionScanner.type_prescription_desc', color: 'bg-blue-500' },
  { type: 'lab_result', icon: FlaskConical, labelKey: 'visionScanner.type_lab_result', descKey: 'visionScanner.type_lab_result_desc', color: 'bg-cyan-500' },
  { type: 'medicine_label', icon: FileText, labelKey: 'visionScanner.type_medicine_label', descKey: 'visionScanner.type_medicine_label_desc', color: 'bg-emerald-500' },
  { type: 'doctor_note', icon: Stethoscope, labelKey: 'visionScanner.type_doctor_note', descKey: 'visionScanner.type_doctor_note_desc', color: 'bg-purple-500' },
  { type: 'vaccine_card', icon: Syringe, labelKey: 'visionScanner.type_vaccine_card', descKey: 'visionScanner.type_vaccine_card_desc', color: 'bg-amber-500' },
];

export default function VisionScanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useCountry();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('select');
  const [selectedType, setSelectedType] = useState<ScanType | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [savedScan, setSavedScan] = useState<VisionScan | null>(null);
  const [recentScans, setRecentScans] = useState<VisionScan[]>([]);
  const [corrections, setCorrections] = useState<Record<string, any>>({});
  const [storedImageUrl, setStoredImageUrl] = useState<string>('');

  const loadRecentScans = useCallback(async () => {
    if (!user) return;
    try {
      const scans = await getScans(user.id, 10);
      setRecentScans(scans);
    } catch (err) {
      console.error('Failed to load recent scans:', err);
    }
  }, [user]);

  // Load on mount
  useEffect(() => { void loadRecentScans(); }, [loadRecentScans]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file || !user || !selectedType) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setStage('uploading');
    try {
      const imageUrl = await uploadScanImage(user.id, file);
      setStoredImageUrl(imageUrl);
      setStage('scanning');

      let result: any = {};
      if (selectedType === 'prescription') {
        result = await scanPrescription(file);
      } else if (selectedType === 'lab_result') {
        result = await scanLabResult(file);
      } else if (selectedType === 'medicine_label') {
        result = await scanMedicineLabel(file);
      } else {
        result = await scanDocument(file, selectedType);
      }

      setScanResult(result);
      setStage('review');
    } catch (err: any) {
      console.error('Scan failed:', err);
      toast.error(err?.message || t('visionScanner.error_scan_failed'));
      setStage('select');
    }
  }, [user, selectedType, t]);

  const handleSave = async () => {
    if (!user || !selectedType) return;
    try {
      const scan = await saveScan(user.id, {
        scan_type: selectedType,
        image_url: storedImageUrl || imagePreview,
        extracted_data: scanResult,
        detected_medications: scanResult?.medications,
        detected_doctor: scanResult?.doctor_name,
        detected_facility: scanResult?.facility || scanResult?.lab_name,
        detected_date: scanResult?.date,
        detected_next_appointment: scanResult?.next_appointment,
        detected_test_name: scanResult?.test_name,
        detected_results: scanResult?.results,
        confidence_score: typeof scanResult?.confidence === 'number' ? scanResult.confidence : 0.85,
        was_reviewed_by_user: true,
        was_corrected: Object.keys(corrections).length > 0,
        user_corrections: corrections,
      });
      setSavedScan(scan);
      setStage('saved');
      toast.success(t('visionScanner.saved_to_wallet'));
      void loadRecentScans();
    } catch (err) {
      console.error('Save failed:', err);
      toast.error(t('common.error'));
    }
  };

  const reset = () => {
    setStage('select');
    setSelectedType(null);
    setImagePreview('');
    setScanResult(null);
    setSavedScan(null);
    setCorrections({});
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{t('visionScanner.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('visionScanner.subtitle')}</p>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileSelect(file);
          }}
        />

        {/* Stage: Select type */}
        {stage === 'select' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-10 w-10 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t('visionScanner.what_to_scan')}</h2>
              <p className="text-sm text-muted-foreground">{t('visionScanner.what_to_scan_desc')}</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {SCAN_TYPES.map(({ type, icon: Icon, labelKey, descKey, color }, i) => (
                <motion.button
                  key={type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    setSelectedType(type);
                    fileInputRef.current?.click();
                  }}
                  className="bg-card border-2 rounded-2xl p-4 text-left hover:border-primary/40 hover:shadow-md transition-all min-h-[120px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group"
                  aria-label={t(labelKey)}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-2 text-white', color)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-bold text-sm">{t(labelKey)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t(descKey)}</p>
                </motion.button>
              ))}
            </div>

            {/* Recent scans */}
            {recentScans.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  {t('visionScanner.recent_scans')}
                </h3>
                <div className="space-y-2">
                  {recentScans.slice(0, 5).map(scan => (
                    <Card key={scan.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {scan.image_url && <img src={scan.image_url} alt="" className="w-full h-full object-cover" aria-hidden="true" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">
                            {scan.scan_type === 'prescription' && (scan.detected_doctor || t('visionScanner.type_prescription'))}
                            {scan.scan_type === 'lab_result' && (scan.detected_test_name || t('visionScanner.type_lab_result'))}
                            {scan.scan_type === 'medicine_label' && t('visionScanner.type_medicine_label')}
                            {scan.scan_type === 'doctor_note' && t('visionScanner.type_doctor_note')}
                            {scan.scan_type === 'vaccine_card' && t('visionScanner.type_vaccine_card')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {scan.created_at && new Date(scan.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {scan.detected_medications?.length || scan.detected_results?.length || 0} itens
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Stage: Uploading */}
        {stage === 'uploading' && (
          <div className="text-center py-12" role="status" aria-live="polite">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" aria-hidden="true" />
            <p className="font-bold">{t('visionScanner.uploading')}</p>
            <p className="text-sm text-muted-foreground">{t('visionScanner.uploading_desc')}</p>
          </div>
        )}

        {/* Stage: Scanning */}
        {stage === 'scanning' && (
          <div className="text-center py-12" role="status" aria-live="polite">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4"
            >
              <Sparkles className="h-10 w-10 text-white" aria-hidden="true" />
            </motion.div>
            <p className="font-bold">{t('visionScanner.scanning')}</p>
            <p className="text-sm text-muted-foreground">{t('visionScanner.scanning_desc')}</p>
            <div className="mt-4 max-w-xs mx-auto space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        )}

        {/* Stage: Review */}
        {stage === 'review' && imagePreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                {t('visionScanner.scan_complete')}
              </Badge>
              <span className="text-xs text-muted-foreground">{t('visionScanner.review_prompt')}</span>
            </div>

            {/* Image preview */}
            <div className="rounded-2xl overflow-hidden border-2 max-h-64">
              <img src={imagePreview} alt={t('visionScanner.scanned_image_alt')} className="w-full object-cover" />
            </div>

            {/* Extracted data */}
            {scanResult?.medications && scanResult.medications.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <Pill className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    {t('visionScanner.medications_found')}
                  </h3>
                  {scanResult.medications.map((med: DetectedMedication, i: number) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-1">
                      <p className="font-bold">{med.name || t('visionScanner.unknown_medication')}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {med.dosage && <p><strong>{t('visionScanner.dosage')}:</strong> {med.dosage}</p>}
                        {med.frequency && <p><strong>{t('visionScanner.frequency')}:</strong> {med.frequency}</p>}
                        {med.duration && <p><strong>{t('visionScanner.duration')}:</strong> {med.duration}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {scanResult?.results && scanResult.results.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                    {scanResult.test_name || t('visionScanner.lab_results')}
                  </h3>
                  {scanResult.results.map((res: DetectedLabResult, i: number) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="font-bold">{res.parameter}</p>
                        <p className="text-xs text-muted-foreground">{res.reference_range}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{res.value} {res.unit}</p>
                        {res.status && (
                          <Badge variant="outline" className={cn(
                            'text-[10px] ml-auto',
                            res.status === 'normal' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            res.status === 'high' && 'bg-amber-50 text-amber-700 border-amber-200',
                            res.status === 'low' && 'bg-blue-50 text-blue-700 border-blue-200',
                            res.status === 'critical' && 'bg-red-50 text-red-700 border-red-200',
                          )}>
                            {t(`visionScanner.status_${res.status}`)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {(scanResult?.doctor_name || scanResult?.facility || scanResult?.date) && (
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <h3 className="font-bold mb-2">{t('visionScanner.details')}</h3>
                  {scanResult.doctor_name && <p><strong>{t('visionScanner.doctor')}:</strong> {scanResult.doctor_name}</p>}
                  {scanResult.facility && <p><strong>{t('visionScanner.facility')}:</strong> {scanResult.facility}</p>}
                  {scanResult.date && <p><strong>{t('visionScanner.date')}:</strong> {scanResult.date}</p>}
                  {scanResult.next_appointment && <p><strong>{t('visionScanner.next_appointment')}:</strong> {scanResult.next_appointment}</p>}
                </CardContent>
              </Card>
            )}

            {/* Empty result */}
            {(!scanResult?.medications?.length && !scanResult?.results?.length && !scanResult?.name) && (
              <div className="text-center p-6 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500" aria-hidden="true" />
                <p className="font-bold">{t('visionScanner.no_data_extracted')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('visionScanner.no_data_desc')}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={reset}
                className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('visionScanner.rescan')}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('visionScanner.save_to_wallet')}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Stage: Saved */}
        {stage === 'saved' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden="true" />
            </motion.div>
            <h2 className="text-xl font-bold mb-2">{t('visionScanner.saved_title')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('visionScanner.saved_desc')}</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button
                onClick={() => navigate('/health/wallet')}
                className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('visionScanner.go_to_wallet')}
                <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={reset}
                className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('visionScanner.scan_another')}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
