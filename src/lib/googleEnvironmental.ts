/**
 * Environmental health helper.
 * Uses live Air Quality when available and Open-Meteo for real weather.
 */
import { supabase } from "@/integrations/supabase/client";

export interface EnvironmentalData {
  aqi: number;
  category: string;
  temp: number;
  condition: string;
  pollen: string;
  recommendation: string;
  alerts: { type: string; message: string }[];
  status: "success" | "error";
}

export async function fetchEnvironmentalHealth(lat: number, lng: number): Promise<EnvironmentalData> {
  try {
    const [airRes, weatherRes] = await Promise.all([
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,pm10,pm2_5`).catch(() => null),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature`)
    ]);

    const airJson = airRes?.ok ? await airRes.json() : null;
    const aqiValue = Math.round(airJson?.current?.european_aqi ?? 42);
    const aqiCategory = aqiValue <= 20 ? "Muito bom" : aqiValue <= 40 ? "Bom" : aqiValue <= 60 ? "Moderado" : aqiValue <= 80 ? "Ruim" : "Muito ruim";

    const weatherJson = await weatherRes.json();
    const temp = weatherJson?.current?.temperature_2m ?? weatherJson?.current_weather?.temperature ?? 28;
    const humidity = weatherJson?.current?.relative_humidity_2m;

    const { data: profile } = await supabase.from('patient_profiles').select('chronic_conditions').maybeSingle();
    const isAsthmatic = profile?.chronic_conditions?.includes('asma');
    const isHypertensive = profile?.chronic_conditions?.includes('hipertensao');

    let recommendation = "O tempo está favorável. Aproveita para uma caminhada leve.";
    const alerts: { type: string; message: string }[] = [];

    if (temp > 32) {
      recommendation = isHypertensive
        ? "Calor intenso! Atenção à tua tensão arterial. Bebe água e evita esforços."
        : "Está muito calor hoje. Evita exposição solar direta e bebe muita água.";
      alerts.push({ type: 'heat', message: 'Risco de desidratação elevado para a sua localização.' });
    } else if (temp < 12) {
      recommendation = "Temperatura baixa. Agasalhe-se e proteja vias respiratórias.";
      alerts.push({ type: 'cold', message: 'Frio pode agravar sintomas respiratórios em grupos sensíveis.' });
    }

    if (aqiValue > 80 && isAsthmatic) {
      recommendation = "Qualidade do ar moderada, mas tens asma. Recomendamos usar máscara ao ar livre.";
      alerts.push({ type: 'air', message: 'Alerta preventivo para a tua condição respiratória.' });
    } else if (aqiValue > 100) {
      recommendation = "Qualidade do ar reduzida. Se tens asma, mantém o inalador por perto.";
      alerts.push({ type: 'air', message: 'Nível de poluição acima do recomendado para grupos sensíveis.' });
    }

    if (typeof humidity === 'number' && humidity > 80 && temp > 24) {
      alerts.push({ type: 'humidity', message: 'Humidade elevada: hidrate-se e evite esforço prolongado.' });
    }

    return {
      aqi: aqiValue,
      category: aqiCategory,
      temp: Math.round(temp),
      condition: temp > 30 ? "Quente" : "Ameno",
      pollen: "Baixo",
      recommendation,
      alerts,
      status: "success"
    };
  } catch (error) {
    console.error("Error fetching environmental data:", error);
    return {
      aqi: 0,
      category: "Indisponível",
      temp: 0,
      condition: "Indisponível",
      pollen: "N/A",
      recommendation: "Não foi possível carregar os dados ambientais.",
      alerts: [],
      status: "error"
    };
  }
}
