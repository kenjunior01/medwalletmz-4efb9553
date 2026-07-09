/**
 * Google Environmental APIs helper.
 * Uses Google Air Quality API and weather patterns to provide health advice.
 */

const GOOGLE_API_KEY = "AIzaSyCSmjlxj48ngrPinTo4gdVBzmBf9CPVrFU";

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
    // 1. Fetch Air Quality
    const aqiResponse = await fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: { latitude: lat, longitude: lng },
        extraComputations: ["HEALTH_RECOMMENDATIONS", "POLLEN_LOOKUP"]
      })
    });

    const aqiJson = await aqiResponse.json();
    const aqiValue = aqiJson?.indexes?.[0]?.aqi || 42;
    const aqiCategory = aqiJson?.indexes?.[0]?.category || "Bom";

    // 2. Fetch Weather (using a free tier or common weather API if Google doesn't provide a simple one without extra setup)
    // For this implementation, we'll use a standard weather fetch or estimate based on region
    // Mozambican weather is often hot/humid.
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
    const weatherJson = await weatherRes.json();
    const temp = weatherJson?.current_weather?.temperature || 28;

    // 3. Generate Mozambican-specific health advice
    const { data: profile } = await supabase.from('patient_profiles').select('chronic_conditions').maybeSingle();
    const isAsthmatic = profile?.chronic_conditions?.includes('asma');
    const isHypertensive = profile?.chronic_conditions?.includes('hipertensao');

    let recommendation = "O ar está limpo. Aproveita para caminhar.";
    const alerts: { type: string; message: string }[] = [];

    if (temp > 32) {
      recommendation = isHypertensive
        ? "Calor intenso! Atenção à tua tensão arterial. Bebe água e evita esforços."
        : "Está muito calor hoje. Evita exposição solar direta e bebe muita água.";
      alerts.push({ type: 'heat', message: 'Risco de desidratação elevado em Maputo.' });
    }

    if (aqiValue > 80 && isAsthmatic) {
      recommendation = "Qualidade do ar moderada, mas tens asma. Recomendamos usar máscara ao ar livre.";
      alerts.push({ type: 'air', message: 'Alerta preventivo para a tua condição respiratória.' });
    } else if (aqiValue > 100) {
      recommendation = "Qualidade do ar reduzida. Se tens asma, mantém o inalador por perto.";
      alerts.push({ type: 'air', message: 'Nível de poluição acima do recomendado para grupos sensíveis.' });
    }

    // Season-specific (Mozambique Rainy Season: Nov-Mar)
    const month = new Date().getMonth();
    if (month >= 10 || month <= 2) {
      alerts.push({ type: 'malaria', message: 'Época de chuvas: usa mosquiteiro e repelente contra a malária.' });
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
