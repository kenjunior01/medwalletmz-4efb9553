import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountry } from '@/contexts/CountryContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Package, CheckCircle, Star, Tag, Filter, Search, Heart, Clock, MapPin,
} from "@/components/icons/lucide-compat";
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────
interface HealthPackage {
  id: string;
  nameKey: string;
  descriptionKey: string;
  facility: string;
  price: number;
  currency: string;
  originalPrice?: number;
  services: string[];
  validDays: number;
  rating: number;
  reviewsCount: number;
  imageEmoji: string;
  category: 'checkup' | 'dental' | 'prenatal' | 'lab' | 'vision' | 'wellness';
  badge?: string;
}
type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';
type CategoryFilter = 'all' | HealthPackage['category'];

// ── Coupon codes ────────────────────────────────────────────────────────────
const COUPONS: Record<string, number> = {
  SAUDE10: 10, BEM20: 20, MAPUTO15: 15, MEDWALLET25: 25,
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('pt-MZ', { style: 'currency', currency }).format(value);

const theme = {
  primary: 'hsl(var(--primary))',
  text: 'hsl(var(--foreground))',
  muted: 'hsl(var(--muted-foreground))',
  border: 'hsl(var(--border))',
  success: 'hsl(var(--success))',
  surface: 'hsl(var(--muted))',
  card: 'hsl(var(--card))',
  error: 'hsl(var(--destructive))',
  secondaryText: 'hsl(var(--muted-foreground))',
};

// ── 12 mock packages (MZN 500–3000 across 6 categories) ────────────────────
const mkPkg = (
  id: string, nameKey: string, descriptionKey: string, facility: string,
  price: number, services: string[], validDays: number, rating: number,
  reviewsCount: number, emoji: string, category: HealthPackage['category'],
  originalPrice?: number, badge?: string,
): HealthPackage => ({
  id, nameKey, descriptionKey, facility, price, currency: 'MZN',
  originalPrice, services, validDays, rating, reviewsCount, imageEmoji: emoji,
  category, badge,
});

const PACKAGES: HealthPackage[] = [
  mkPkg('chk-1', 'mp.pkg.checkupBasic.name', 'mp.pkg.checkupBasic.desc', 'mp.fac.clinicMaputo',
    800, ['mp.svc.bloodTest','mp.svc.urineTest','mp.svc.bpMeasure','mp.svc.generalConsult'],
    90, 4.7, 234, '🩺', 'checkup', undefined, 'mp.badge.popular'),
  mkPkg('chk-2', 'mp.pkg.checkupPremium.name', 'mp.pkg.checkupPremium.desc', 'mp.fac.hospitalCentral',
    2500, ['mp.svc.fullBloodPanel','mp.svc.ecg','mp.svc.chestXray','mp.svc.abdominalUS','mp.svc.specialistConsult'],
    180, 4.9, 89, '🏥', 'checkup', 3000, 'mp.badge.bestValue'),
  mkPkg('dnt-1', 'mp.pkg.dentalClean.name', 'mp.pkg.dentalClean.desc', 'mp.fac.dentalCare',
    600, ['mp.svc.dentalCleaning','mp.svc.dentalExam','mp.svc.fluoride'], 60, 4.5, 312, '🦷', 'dental'),
  mkPkg('dnt-2', 'mp.pkg.dentalOrtho.name', 'mp.pkg.dentalOrtho.desc', 'mp.fac.orthoCenter',
    2800, ['mp.svc.orthoConsult','mp.svc.panoramicXray','mp.svc.bracesFitting'],
    365, 4.8, 56, '😁', 'dental', undefined, 'mp.badge.premium'),
  mkPkg('pre-1', 'mp.pkg.prenatalBasic.name', 'mp.pkg.prenatalBasic.desc', 'mp.fac.maternidade',
    1200, ['mp.svc.obgynConsult','mp.svc.ultrasound','mp.svc.bloodType'],
    90, 4.6, 178, '🤰', 'prenatal', undefined, 'mp.badge.recommended'),
  mkPkg('pre-2', 'mp.pkg.prenatalComplete.name', 'mp.pkg.prenatalComplete.desc', 'mp.fac.hospitalCentral',
    3000, ['mp.svc.obgynConsult','mp.svc.ultrasound3d','mp.svc.glucoseTest','mp.svc.hemoglobin','mp.svc.nutritionPlan'],
    280, 4.9, 42, '👶', 'prenatal', 3500),
  mkPkg('lab-1', 'mp.pkg.labBasic.name', 'mp.pkg.labBasic.desc', 'mp.fac.labMoza',
    500, ['mp.svc.hemoglobin','mp.svc.malariaTest','mp.svc.hivTest'],
    30, 4.4, 521, '🔬', 'lab', undefined, 'mp.badge.popular'),
  mkPkg('lab-2', 'mp.pkg.labAdvanced.name', 'mp.pkg.labAdvanced.desc', 'mp.fac.labPrecision',
    1800, ['mp.svc.lipidPanel','mp.svc.thyroidPanel','mp.svc.liverFunction','mp.svc.kidneyFunction','mp.svc.vitaminD'],
    60, 4.8, 134, '🧪', 'lab'),
  mkPkg('vis-1', 'mp.pkg.visionBasic.name', 'mp.pkg.visionBasic.desc', 'mp.fac.opticaMaputo',
    700, ['mp.svc.eyeExam','mp.svc.refractionTest','mp.svc.prescription'],
    90, 4.3, 267, '👓', 'vision'),
  mkPkg('vis-2', 'mp.pkg.visionFull.name', 'mp.pkg.visionFull.desc', 'mp.fac.opticaPremium',
    2200, ['mp.svc.eyeExam','mp.svc.octScan','mp.svc.glassesFrame','mp.svc.lenses'],
    180, 4.7, 91, '👁️', 'vision', 2600, 'mp.badge.bestValue'),
  mkPkg('wel-1', 'mp.pkg.wellnessMassage.name', 'mp.pkg.wellnessMassage.desc', 'mp.fac.spaZen',
    900, ['mp.svc.deepTissueMassage','mp.svc.aromatherapy','mp.svc.relaxationSession'],
    60, 4.6, 189, '🧘', 'wellness'),
  mkPkg('wel-2', 'mp.pkg.wellnessFull.name', 'mp.pkg.wellnessFull.desc', 'mp.fac.wellnessHub',
    1600, ['mp.svc.physioSession','mp.svc.nutritionConsult','mp.svc.meditationClass','mp.svc.fitnessAssessment'],
    120, 4.5, 73, '🌿', 'wellness'),
];

// ── Category tabs ──────────────────────────────────────────────────────────
const CATEGORIES: { key: CategoryFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'mp.cat.all' }, { key: 'checkup', labelKey: 'mp.cat.checkup' },
  { key: 'dental', labelKey: 'mp.cat.dental' }, { key: 'prenatal', labelKey: 'mp.cat.prenatal' },
  { key: 'lab', labelKey: 'mp.cat.lab' }, { key: 'vision', labelKey: 'mp.cat.vision' },
  { key: 'wellness', labelKey: 'mp.cat.wellness' },
];

// ── Framer-motion stagger variants ────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' },
  }),
};

// ── Component ──────────────────────────────────────────────────────────────
export function HealthMarketplace() {
  const { t } = useCountry();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<SortOption>('popular');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // ── Apply coupon ────────────────────────────────────────────────────────
  const applyCoupon = useCallback(() => {
    const discount = COUPONS[couponCode.trim().toUpperCase()];
    if (discount) {
      setCouponDiscount(discount);
      toast.success(t('mp.couponApplied', { discount: String(discount) }));
    } else {
      setCouponDiscount(0);
      toast.error(t('mp.couponInvalid'));
    }
  }, [couponCode, t]);

  // ── Toggle favorite ─────────────────────────────────────────────────────
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(t('mp.removedFavorite')); }
      else { next.add(id); toast.success(t('mp.addedFavorite')); }
      return next;
    });
  }, [t]);

  // ── Price after coupon ──────────────────────────────────────────────────
  const effectivePrice = useCallback(
    (price: number) =>
      couponDiscount > 0 ? Math.round(price * (1 - couponDiscount / 100)) : price,
    [couponDiscount],
  );

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const results = PACKAGES.filter((pkg) => {
      const matchCat = category === 'all' || pkg.category === category;
      const name = t(pkg.nameKey).toLowerCase();
      const desc = t(pkg.descriptionKey).toLowerCase();
      const fac = t(pkg.facility).toLowerCase();
      return matchCat && (!q || name.includes(q) || desc.includes(q) || fac.includes(q));
    });
    const sorted = [...results];
    if (sort === 'popular') sorted.sort((a, b) => b.reviewsCount - a.reviewsCount);
    else if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [search, category, sort, t]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Package size={28} style={{ color: theme.primary }} />
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>{t('mp.title')}</h1>
      </div>

      {/* Search + Coupon + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.muted }} />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('mp.searchPlaceholder')} className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.muted }} />
            <Input
              value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
              placeholder={t('mp.couponPlaceholder')} className="pl-9 w-40"
            />
          </div>
          <Button variant="outline" onClick={applyCoupon}
            style={{ borderColor: theme.primary, color: theme.primary }}>
            {t('mp.applyCoupon')}
          </Button>
        </div>

        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.muted }} />
          <select
            value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-10 rounded-md border bg-transparent pl-9 pr-3 text-sm appearance-none cursor-pointer"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            <option value="popular">{t('mp.sort.popular')}</option>
            <option value="price-asc">{t('mp.sort.priceAsc')}</option>
            <option value="price-desc">{t('mp.sort.priceDesc')}</option>
            <option value="rating">{t('mp.sort.rating')}</option>
          </select>
        </div>
      </div>

      {/* Active coupon badge */}
      {couponDiscount > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Badge className="gap-1 px-3 py-1 text-sm"
            style={{ background: theme.success, color: 'hsl(var(--primary-foreground))' }}>
            <Tag size={14} />{t('mp.activeCoupon', { discount: String(couponDiscount) })}
          </Badge>
        </motion.div>
      )}

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          return (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                background: active ? theme.primary : theme.surface,
                color: active ? 'hsl(var(--primary-foreground))' : theme.text,
                border: `1px solid ${active ? theme.primary : theme.border}`,
              }}>
              {t(cat.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Package grid — 1 col mobile, 2 cols tablet+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnimatePresence mode="popLayout">
          {filtered.map((pkg, idx) => {
            const price = effectivePrice(pkg.price);
            const hasOriginal = couponDiscount > 0 || !!pkg.originalPrice;
            const strikePrice = couponDiscount > 0
              ? pkg.price : pkg.originalPrice ?? pkg.price;

            return (
              <motion.div key={pkg.id} custom={idx}
                variants={cardVariants} initial="hidden" animate="visible"
                exit={{ opacity: 0, y: -12 }} layout>
                <Card className="relative overflow-hidden flex flex-col gap-4 p-5 transition-shadow hover:shadow-lg"
                  style={{ background: theme.card, borderColor: theme.border }}>

                  {/* Top: emoji / info / badge / heart */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl leading-none">{pkg.imageEmoji}</span>
                      <div className="flex flex-col gap-0.5">
                        <h3 className="font-semibold text-base" style={{ color: theme.text }}>
                          {t(pkg.nameKey)}
                        </h3>
                        <span className="flex items-center gap-1 text-xs" style={{ color: theme.muted }}>
                          <MapPin size={12} />{t(pkg.facility)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pkg.badge && (
                        <Badge className="text-[11px]"
                          style={{ background: theme.primary, color: 'hsl(var(--primary-foreground))' }}>
                          {t(pkg.badge)}
                        </Badge>
                      )}
                      <button onClick={() => toggleFavorite(pkg.id)}
                        aria-label={t('mp.toggleFavorite')}>
                        <Heart size={20} className="transition-colors"
                          fill={favorites.has(pkg.id) ? theme.error : 'transparent'}
                          style={{ color: favorites.has(pkg.id) ? theme.error : theme.muted }} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed" style={{ color: theme.secondaryText }}>
                    {t(pkg.descriptionKey)}
                  </p>

                  {/* Services list */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: theme.muted }}>{t('mp.includedServices')}</span>
                    <ul className="flex flex-col gap-1">
                      {pkg.services.map((svc) => (
                        <li key={svc} className="flex items-center gap-2 text-sm"
                          style={{ color: theme.text }}>
                          <CheckCircle size={14} style={{ color: theme.success }} />
                          {t(svc)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Rating + validity */}
                  <div className="flex items-center gap-4 text-xs"
                    style={{ color: theme.secondaryText }}>
                    <span className="flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      {pkg.rating} ({pkg.reviewsCount})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />{t('mp.validDays', { days: String(pkg.validDays) })}
                    </span>
                  </div>

                  {/* Price + reserve button */}
                  <div className="flex items-end justify-between mt-auto pt-3 border-t"
                    style={{ borderColor: theme.border }}>
                    <div className="flex flex-col gap-0.5">
                      {hasOriginal && (
                        <span className="text-sm line-through" style={{ color: theme.muted }}>
                          {formatCurrency(strikePrice, pkg.currency)}
                        </span>
                      )}
                      <span className="text-xl font-bold" style={{ color: theme.primary }}>
                        {formatCurrency(price, pkg.currency)}
                      </span>
                    </div>
                    <Button
                      onClick={() =>
                        toast.success(t('mp.reservationSuccess', { name: t(pkg.nameKey) }))}
                      className="font-semibold rounded-full px-5"
                      style={{ background: theme.primary, color: 'hsl(var(--primary-foreground))' }}>
                      {t('mp.reservePackage')}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-16">
          <Search size={40} style={{ color: theme.muted }} />
          <p className="text-sm" style={{ color: theme.muted }}>{t('mp.noResults')}</p>
        </motion.div>
      )}
    </div>
  );
}

export default HealthMarketplace;
