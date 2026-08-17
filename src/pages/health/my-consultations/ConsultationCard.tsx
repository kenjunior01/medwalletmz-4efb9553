import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Calendar as CalIcon,
  Video,
  MessageCircle,
  MapPin,
  Clock,
  Loader2,
  CalendarClock,
  X,
} from '@/components/icons/lucide-compat';
import type { Consultation } from './types';
import { STATUS_CONFIG } from './types';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface ConsultationCardProps {
  c: Consultation;
  t: TranslateFn;
  isBusy: boolean;
  countdown: { text: string; urgency: 'high' | 'medium' | 'low' } | null;
  modifiable: boolean;
  joinable: boolean;
  formatDateTime: (iso: string) => string;
  formatBookedDate: (iso: string) => string;
  onViewDetails: (c: Consultation) => void;
  onJoinVideo: (c: Consultation) => void;
  onReschedule: (c: Consultation) => void;
  onCancel: (c: Consultation) => void;
}

export function ConsultationCard({
  c,
  t,
  isBusy,
  countdown,
  modifiable,
  joinable,
  formatDateTime,
  formatBookedDate,
  onViewDetails,
  onJoinVideo,
  onReschedule,
  onCancel,
}: ConsultationCardProps) {
  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.scheduled;
  const doctorInitial = c.doctor_name?.[0]?.toUpperCase() || 'M';

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow',
        countdown?.urgency === 'high' && 'ring-2 ring-amber-300',
      )}
    >
      <CardContent className="p-0">
        {/* ── Card header (button → view details) ── */}
        <button
          type="button"
          onClick={() => onViewDetails(c)}
          aria-label={`${t('common.doctor')}: ${
            c.doctor_name || t('myConsultations.doctor_unknown')
          } — ${formatDateTime(c.scheduled_at)}`}
          className="w-full text-left p-4 flex gap-3 items-start hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          {/* Doctor avatar/photo */}
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pharmacy to-primary flex items-center justify-center text-pharmacy-foreground font-bold shrink-0 overflow-hidden">
            {c.doctor_avatar ? (
              <img
                src={c.doctor_avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden="true">{doctorInitial}</span>
            )}
          </div>

          {/* Doctor info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {t('myConsultations.doctor_prefix')}{' '}
              {c.doctor_name || t('myConsultations.doctor_unknown')}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {c.doctor_specialty?.icon && (
                <span aria-hidden="true">
                  {c.doctor_specialty.icon}{' '}
                </span>
              )}
              {c.doctor_specialty?.name ||
                t('myConsultations.specialty_unknown')}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Clock
                className="h-3 w-3 shrink-0"
                aria-hidden="true"
              />
              <time dateTime={c.scheduled_at}>
                {formatDateTime(c.scheduled_at)}
              </time>
              <span aria-hidden="true">·</span>
              <span>
                {t('myConsultations.duration_minutes', {
                  minutes: String(c.duration_minutes || 30),
                })}
              </span>
            </div>
            {c.doctor_city && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <MapPin
                  className="h-3 w-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{c.doctor_city}</span>
              </div>
            )}
          </div>

          {/* Status badge + type icon */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn('text-xs gap-1', statusCfg.badgeClass)}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  statusCfg.dotClass,
                )}
                aria-hidden="true"
              />
              {t(statusCfg.labelKey)}
            </Badge>
            {c.consultation_type === 'video' && (
              <Video
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {c.consultation_type === 'chat' && (
              <MessageCircle
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {c.consultation_type === 'in_person' && (
              <MapPin
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
        </button>

        {/* ── Countdown indicator ── */}
        {countdown && (
          <div
            role="status"
            className={cn(
              'px-4 py-2 text-xs font-medium border-t flex items-center gap-1.5',
              countdown.urgency === 'high' &&
                'bg-amber-50 text-amber-700 border-amber-100',
              countdown.urgency === 'medium' &&
                'bg-blue-50 text-blue-700 border-blue-100',
              countdown.urgency === 'low' &&
                'bg-muted text-muted-foreground border-muted',
            )}
          >
            <CalendarClock
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            <span>{countdown.text}</span>
          </div>
        )}

        {/* ── Quick actions ── */}
        {(modifiable || joinable) && (
          <div className="flex flex-wrap gap-2 p-3 border-t bg-muted/20">
            {joinable && (
              <Button
                size="sm"
                className="flex-1 min-h-[44px] gap-1.5 bg-green-600 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                disabled={isBusy}
                onClick={() => onJoinVideo(c)}
                aria-label={t('myConsultations.join_video_label')}
              >
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                {t('myConsultations.join_video')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              disabled={isBusy}
              onClick={() => onViewDetails(c)}
              aria-label={t('common.view_details')}
            >
              {t('common.view_details')}
            </Button>
            {modifiable && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  disabled={isBusy}
                  onClick={() => onReschedule(c)}
                  aria-label={t('myConsultations.reschedule')}
                >
                  {isBusy ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CalIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  )}
                  <span className="hidden sm:inline">
                    {t('myConsultations.reschedule')}
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] gap-1.5 text-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                  disabled={isBusy}
                  onClick={() => onCancel(c)}
                  aria-label={t('myConsultations.cancel')}
                >
                  <X
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">
                    {t('myConsultations.cancel')}
                  </span>
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Footer: booked-on date ── */}
        {c.created_at && (
          <div className="px-4 py-2 text-[10px] text-muted-foreground/70 border-t bg-muted/10">
            {t('myConsultations.booked_on')}: {formatBookedDate(c.created_at)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
