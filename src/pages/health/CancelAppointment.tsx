import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ArrowLeft, Calendar, Clock, User, AlertTriangle, Loader2 } from "@/components/icons/lucide-compat";
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/CountryContext';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  scheduled: 'default',
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'outline',
};

const statusLabel: Record<string, string> = {
  scheduled: 'cancelAppointment.status_scheduled',
  confirmed: 'cancelAppointment.status_confirmed',
  in_progress: 'cancelAppointment.status_in_progress',
  completed: 'cancelAppointment.status_completed',
  cancelled: 'cancelAppointment.status_cancelled',
  no_show: 'cancelAppointment.status_no_show',
};

const typeLabel: Record<string, string> = {
  in_person: 'cancelAppointment.type_in_person',
  video: 'cancelAppointment.type_video',
  emergency: 'cancelAppointment.type_emergency',
  follow_up: 'cancelAppointment.type_follow_up',
};

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  type: string;
  reason: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  doctor_name?: string;
  doctor_specialty?: string;
  facility_name?: string;
}

export default function CancelAppointment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [reason, setReason] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  // Fetch appointment by ID
  const { data: appointment, isLoading, isError } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async (): Promise<Appointment | null> => {
      if (!id) return null;

      const { data, error } = await (supabase as any)
        .from('appointments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch doctor profile info
      const row = data as Partial<Appointment> & Record<string, any>;
      const doctorName = await fetchDoctorName(row.doctor_id ?? '');
      return { ...row, doctor_name: doctorName } as Appointment;
    },
    enabled: !!id,
    retry: 1,
  });

  const fetchDoctorName = async (doctorId: string): Promise<string> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', doctorId)
      .maybeSingle();
    return profile?.full_name || 'Médico';
  };

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ appointmentId, cancellationReason }: { appointmentId: string; cancellationReason: string }) => {
      const { error } = await (supabase as any)
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Free up availability slot if one exists
      await supabase
        .from('doctor_availability_slots')
        .update({ is_booked: false, consultation_id: null })
        .eq('consultation_id', appointmentId);
    },
    onSuccess: () => {
      toast.success(t('cancelAppointment.success'));
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      navigate('/health/consultations');
    },
    onError: (error: any) => {
      toast.error(t('cancelAppointment.error_cancel', { message: error?.message || '' }));
    },
  });

  const handleOpenDialog = () => {
    if (reason.trim().length < 10) {
      toast.error(t('cancelAppointment.min_chars_error'));
      return;
    }
    setShowDialog(true);
  };

  const handleConfirmCancel = () => {
    if (!appointment) return;
    cancelMutation.mutate({
      appointmentId: appointment.id,
      cancellationReason: reason.trim(),
    });
  };

  const formatDateTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString('pt-MZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) + ' às ' + date.toLocaleTimeString('pt-MZ', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // ─── Loading Skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="p-4 space-y-4">
          <Skeleton className="h-52 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </main>
      </div>
    );
  }

  // ─── Error / Not Found ─────────────────────────────────────────────────────
  if (isError || !appointment) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold flex-1">{t('cancelAppointment.title')}</h1>
        </header>
        <main className="p-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">{t('cancelAppointment.not_found')}</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('cancelAppointment.not_found_desc')}
              </p>
              <Button onClick={() => navigate('/health/consultations')}>
                {t('cancelAppointment.view_appointments')}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Already cancelled
  const isAlreadyCancelled = appointment.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold flex-1">{t('cancelAppointment.title')}</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* ─── Appointment Details Card ─────────────────────────────────────── */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{appointment.doctor_name || 'Médico'}</p>
                  {appointment.doctor_specialty && (
                    <p className="text-sm text-muted-foreground">{appointment.doctor_specialty}</p>
                  )}
                </div>
              </div>
              <Badge variant={statusVariant[appointment.status] || 'outline'}>
                {statusLabel[appointment.status] || appointment.status}
              </Badge>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDateTime(appointment.scheduled_at)}</span>
              </div>
              {appointment.type && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Tipo: {t(typeLabel[appointment.type] || appointment.type)}</span>
                </div>
              )}
            </div>

            {appointment.reason && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-1">{t('cancelAppointment.reason_label')}</p>
                <p className="text-sm">{appointment.reason}</p>
              </div>
            )}

            {isAlreadyCancelled && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                Esta consulta já foi cancelada.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Cancellation Reason ──────────────────────────────────────────── */}
        {!isAlreadyCancelled && (
          <>
            <Card>
              <CardContent className="p-5 space-y-3">
                <label htmlFor="cancel-reason" className="text-sm font-medium">
                  Motivo do cancelamento <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="cancel-reason"
                  placeholder={t('cancelAppointment.cancellation_placeholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reason.trim().length}/10 {t('cancelAppointment.min_chars', { count: reason.trim().length.toString() })}
                </p>
              </CardContent>
            </Card>

            {/* ─── Action Button ─────────────────────────────────────────────── */}
            <Button
              className="w-full"
              variant="destructive"
              disabled={reason.trim().length < 10}
              onClick={handleOpenDialog}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('cancelAppointment.cancel_button')}
            </Button>
          </>
        )}
      </main>

      {/* ─── Confirmation Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Tem certeza que deseja cancelar?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Esta acção não pode ser revertida. A consulta com{' '}
              <span className="font-medium text-foreground">
                {appointment.doctor_name}
              </span>{' '}
              em{' '}
              <span className="font-medium text-foreground">
                {formatDateTime(appointment.scheduled_at)}
              </span>{' '}
              será cancelada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={cancelMutation.isPending}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A cancelar…
                </>
              ) : (
                'Sim, cancelar consulta'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
