/**
 * Google Cloud Vision API Utility
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export async function detectText(file: File): Promise<string> {
  if (!API_KEY || API_KEY.includes('your_')) {
    console.warn("Google API Key not configured for Vision, falling back to simulation");
    return simulateOCR(file.name);
  }

  try {
    const base64Image = await fileToBase64(file);
    const content = base64Image.split(',')[1]; // Remove header

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    const annotations = data.responses[0]?.textAnnotations;

    if (!annotations || annotations.length === 0) {
      return "Nenhum texto detectado no documento.";
    }

    return annotations[0].description;
  } catch (error) {
    console.error("Google Vision failed, falling back to simulation:", error);
    return simulateOCR(file.name);
  }
}

async function simulateOCR(filename: string): Promise<string> {
  await new Promise(r => setTimeout(r, 1500));
  return `[Simulado] Conteúdo de ${filename}: Paciente apresenta quadro clínico estável. Recomendado monitoramento contínuo.`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
