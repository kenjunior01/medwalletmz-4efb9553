import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SafeImage } from '@/components/ui/safe-image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2, MapPin, Phone, Navigation, Star, Clock, Calendar, Activity, ShieldCheck, Stethoscope } from 'lucide-react';
import { buildGoogleMapsDirectionsUrl, getSafeImageUrl } from '@/lib/healthRoutes';
import { UniversalReviews } from '@/components/reviews/UniversalReviews';
import { useQuery } from '@tanstack/react-query';
import { useCountry } from '@/contexts/CountryContext';

export default function FacilityDetail() {
    const { country } = useCountry();
    const currency = country?.currency_code || 'MZN';
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: facility, isLoading: loading } = useQuery({
        queryKey: ['facility', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clinics')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            return data as any;
        },
        enabled: !!id
    });

    const { data: services } = useQuery({
        queryKey: ['facility-services', id],
        queryFn: async () => {
            if (facility?.type === 'laboratory') {
                const { data } = await supabase.from('lab_exams').select('*').eq('lab_id', id);
                return data;
            }
            return null;
        },
        enabled: !!facility && facility.type === 'laboratory'
    });

    const { data: clinicDoctors } = useQuery({
        queryKey: ['facility-doctors', id],
        queryFn: async () => {
            const { data } = await supabase
                .from('clinic_doctors')
                .select('*, doctor_profiles(*)')
                .eq('clinic_id', id);
            return data;
        },
        enabled: !!facility && (facility.type === 'clinic' || facility.type === 'hospital')
    });

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
        <div className="flex flex-col pb-24 animate-fade-in">
            {/* Hero Header */}
            <div className="relative h-56">
                <SafeImage src={getSafeImageUrl(facility.logo_url || facility.image_url)} alt={facility.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white rounded-full"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="absolute bottom-6 left-6 right-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-primary border-0">{facility.type === 'hospital' ? 'Hospital' : facility.type === 'clinic' ? 'Clínica' : 'Laboratório'}</Badge>
                        {facility.is_verified && <CheckCircle2 className="h-4 w-4 text-emerald-400 fill-emerald-400/20" />}
                    </div>
                    <h1 className="text-2xl font-black leading-tight">{facility.name}</h1>
                    <p className="text-sm opacity-90 line-clamp-1 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {facility.city} {facility.address ? `· ${facility.address}` : ''}
                    </p>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="p-4">
                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 rounded-2xl h-12 bg-muted/50 p-1">
                        <TabsTrigger value="info" className="rounded-xl">Sobre</TabsTrigger>
                        <TabsTrigger value="services" className="rounded-xl">
                            {facility.type === 'laboratory' ? 'Exames' : 'Serviços'}
                        </TabsTrigger>
                        <TabsTrigger value="reviews" className="rounded-xl">Avaliações</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="mt-6 space-y-6">
                        <section className="space-y-3">
                            <h2 className="text-lg font-black">Informações Gerais</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {facility.description || `${facility.name} é uma referência de saúde em ${facility.city}, oferecendo cuidados de qualidade para toda a comunidade.`}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="bento-card p-3 bg-primary/5 border-primary/10">
                                    <Clock className="h-4 w-4 text-primary mb-1" />
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Horário</p>
                                    <p className="text-xs font-bold">{facility.type === 'hospital' ? 'Aberto 24h' : '08:00 - 18:00'}</p>
                                </div>
                                <div className="bento-card p-3 bg-secondary/5 border-secondary/10">
                                    <Star className="h-4 w-4 text-secondary mb-1" />
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Avaliação</p>
                                    <p className="text-xs font-bold">{facility.rating?.toFixed(1) || '4.8'} / 5.0</p>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-lg font-black">Localização e Contacto</h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bento-card border-transparent bg-muted/30">
                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                        <MapPin className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{facility.address || facility.city}</p>
                                        <p className="text-[10px] text-muted-foreground">Endereço Principal</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={openDirections}>
                                        <Navigation className="h-3.5 w-3.5 mr-1" /> Mapa
                                    </Button>
                                </div>

                                {facility.phone && (
                                    <div className="flex items-center gap-3 p-3 bento-card border-transparent bg-muted/30">
                                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                            <Phone className="h-5 w-5 text-secondary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold">{facility.phone}</p>
                                            <p className="text-[10px] text-muted-foreground">Telefone de Contacto</p>
                                        </div>
                                        <Button size="sm" variant="secondary" className="h-8 rounded-full" asChild>
                                            <a href={`tel:${facility.phone}`}>Ligar</a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </section>

                        <Button className="w-full h-14 rounded-2xl text-lg font-black shadow-premium" onClick={() => navigate('/health/book')}>
                            <Calendar className="mr-2 h-5 w-5" /> Agendar Visita
                        </Button>
                    </TabsContent>

                    <TabsContent value="services" className="mt-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-black">Especialidades e Serviços</h2>
                            <Badge variant="outline">{(services?.length || clinicDoctors?.length || 0)} Disponíveis</Badge>
                        </div>

                        {facility.type === 'laboratory' && services ? (
                            <div className="grid gap-3">
                                {services.map((s: any) => (
                                    <div key={s.id} className="bento-card p-4 flex items-center justify-between border-transparent bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                                                <Activity className="h-5 w-5 text-secondary" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{s.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{s.category}</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-primary">{s.price_mzn} {country?.currency_code || 'MZN'}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (facility.type === 'clinic' || facility.type === 'hospital') && clinicDoctors ? (
                            <div className="grid gap-3">
                                {clinicDoctors.map((cd: any) => (
                                    <div key={cd.id} className="bento-card p-4 flex items-center gap-3 border-transparent bg-muted/30" onClick={() => navigate(`/health/book/${cd.doctor_id}`)}>
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                            {cd.doctor_profiles?.avatar_url ? (
                                                <img src={cd.doctor_profiles.avatar_url} className="h-full w-full object-cover" />
                                            ) : (
                                                <Stethoscope className="h-6 w-6 text-primary" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">Médico Verificado</p>
                                            <p className="text-[10px] text-muted-foreground">{cd.role || 'Especialista'}</p>
                                        </div>
                                        <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-50">
                                <ShieldCheck className="h-12 w-12 mx-auto mb-2" />
                                <p className="text-sm font-medium">Informação de serviços em atualização.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="reviews" className="mt-6">
                        <UniversalReviews clinicId={facility.id} entityName={facility.name} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
