/**
 * Google Cloud Text-to-Speech Utility
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export async function speakText(text: string, languageCode: string = 'pt-PT') {
  if (!API_KEY || API_KEY.includes('your_')) {
    console.warn("Google API Key not configured for TTS, falling back to browser SpeechSynthesis");
    fallbackSpeak(text, languageCode);
    return;
  }

  try {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          ssmlGender: 'FEMALE',
          // Try to use a high-quality Neural2 voice if possible
          name: languageCode === 'pt-PT' ? 'pt-PT-Neural2-A' : 'pt-BR-Neural2-A'
        },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`);
    }

    const data = await response.json();
    const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error("Google TTS failed, falling back to browser:", error);
    fallbackSpeak(text, languageCode);
  }
}

function fallbackSpeak(text: string, languageCode: string) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = languageCode;
  window.speechSynthesis.speak(msg);
}

function base64ToBlob(base64: string, type: string) {
  const binStr = atob(base64);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type });
}
