import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SafeImage } from '@/components/ui/safe-image';
import { ArrowLeft, CheckCircle2, MapPin, Phone, Navigation, Star } from 'lucide-react';
import { buildGoogleMapsDirectionsUrl, getSafeImageUrl } from '@/lib/healthRoutes';
import { UniversalReviews } from '@/components/reviews/UniversalReviews';

export default function FacilityDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [facility, setFacility] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const { data, error } = await supabase.from('clinics').select('*').eq('id', id).maybeSingle();
            if (!cancelled) {
                if (error) {
                    console.error(error);
                    setFacility(null);
                } else {
                    setFacility(data);
                }
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    if (loading) {
        return <div className="p-4 space-y-3"><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>;
    }

    if (!facility) {
        return <div className="p-6 text-center text-muted-foreground">Instituição não encontrada.</div>;
    }

    const openDirections = () => {
        if (!facility.latitude || !facility.longitude) return;
        const url = buildGoogleMapsDirectionsUrl(null, { lat: facility.latitude, lng: facility.longitude }, 'driving');
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="p-4 pb-10 space-y-4">
            <Button variant="ghost" className="px-0" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>

            <div className="overflow-hidden rounded-2xl border bg-card">
                <SafeImage src={getSafeImageUrl(facility.logo_url || facility.image_url)} alt={facility.name} className="h-48 w-full object-cover" />
                <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h1 className="text-xl font-bold">{facility.name}</h1>
                            <p className="text-sm text-muted-foreground">{facility.description || 'Instituição de saúde'}</p>
                        </div>
                        {facility.is_verified && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{facility.type === 'hospital' ? 'Hospital' : facility.type === 'clinic' ? 'Clínica' : 'Instituição'}</Badge>
                        {facility.city && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{facility.city}</Badge>}
                        <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                            <Star className="mr-1 h-3 w-3 fill-yellow-600" />
                            {facility.rating?.toFixed(1) || 'N/A'}
                        </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                        {facility.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{facility.address}</div>}
                        {facility.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{facility.phone}</div>}
                    </div>

                    {facility.latitude && facility.longitude && (
                        <Button className="w-full" onClick={openDirections}>
                            <Navigation className="mr-2 h-4 w-4" /> Ver rotas no Google Maps
                        </Button>
                    )}

                    <div className="pt-4 border-t">
                        <UniversalReviews clinicId={facility.id} entityName={facility.name} />
                    </div>
                </div>
            </div>
        </div>
    );
}
