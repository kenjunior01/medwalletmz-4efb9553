import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from '@/components/icons/lucide-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRange } from './types';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface DoctorOption {
  id: string;
  name: string;
}

interface FiltersPanelProps {
  t: TranslateFn;
  show: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterDoctor: string;
  onDoctorChange: (value: string) => void;
  filterSpecialty: string;
  onSpecialtyChange: (value: string) => void;
  filterDateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  doctorOptions: DoctorOption[];
  specialtyOptions: string[];
}

export function FiltersPanel({
  t,
  show,
  searchQuery,
  onSearchChange,
  filterDoctor,
  onDoctorChange,
  filterSpecialty,
  onSpecialtyChange,
  filterDateRange,
  onDateRangeChange,
  doctorOptions,
  specialtyOptions,
}: FiltersPanelProps) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          id="filters-panel"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <Card>
            <CardContent className="p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <SearchIcon
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder={t('myConsultations.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  aria-label={t('myConsultations.search_aria_label')}
                  className="pl-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>

              {/* Filter selects */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select value={filterDoctor} onValueChange={onDoctorChange}>
                  <SelectTrigger
                    className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={t('myConsultations.filter_doctor')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('myConsultations.filter_doctor_all')}
                    </SelectItem>
                    {doctorOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterSpecialty} onValueChange={onSpecialtyChange}>
                  <SelectTrigger
                    className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={t('myConsultations.filter_specialty')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('myConsultations.filter_specialty_all')}
                    </SelectItem>
                    {specialtyOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filterDateRange}
                  onValueChange={(v) => onDateRangeChange(v as DateRange)}
                >
                  <SelectTrigger
                    className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={t('myConsultations.filter_date_range')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('myConsultations.filter_date_all')}</SelectItem>
                    <SelectItem value="upcoming_30">
                      {t('myConsultations.filter_date_upcoming_30')}
                    </SelectItem>
                    <SelectItem value="past_30">
                      {t('myConsultations.filter_date_past_30')}
                    </SelectItem>
                    <SelectItem value="past_90">
                      {t('myConsultations.filter_date_past_90')}
                    </SelectItem>
                    <SelectItem value="past_year">
                      {t('myConsultations.filter_date_past_year')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
