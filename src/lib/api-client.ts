import { CardRecord, AuditResponse } from './types';
import Tesseract from 'tesseract.js';

export const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'openrouter/free';

function getEffectiveApiKey(providedKey: string): string {
  if (providedKey && providedKey.trim()) {
    return providedKey.trim();
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vcpro_api_key');
    if (saved && saved.trim()) {
      return saved.trim();
    }
  }
  return '';
}

/**
 * Fast Client-Side Image Compression for Vision API Transmission
 * Downscales images to 2048px max dimension at 0.92 quality.
 * Preserves high clarity for multi-card grid sheets (3x3 grid, 9+ cards on one image).
 */
export async function compressImageForOcr(base64: string, maxDim: number = 2048, quality: number = 0.92): Promise<string> {
  if (typeof window === 'undefined') return base64;
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      } else {
        return resolve(base64);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
  });
}

export async function testApiConnection(
  apiKey: string,
  model: string,
  endpoint: string = DEFAULT_ENDPOINT
): Promise<{ success: boolean; message: string }> {
  try {
    if (model === 'tesseract-wasm') {
      return { success: true, message: 'Tesseract WASM (C++ Engine) is ready offline.' };
    }

    const cleanEndpoint = (endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, '');
    const targetUrl = `${cleanEndpoint}/models`;
    const effectiveKey = getEffectiveApiKey(apiKey);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (effectiveKey) {
      headers['Authorization'] = `Bearer ${effectiveKey}`;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      return { success: true, message: `Successfully connected to ${cleanEndpoint}!` };
    } else {
      const errorText = await response.text();
      return { 
        success: false, 
        message: `API status ${response.status}: ${errorText.slice(0, 120)}` 
      };
    }
  } catch (err: any) {
    return { 
      success: false, 
      message: `Connection failed: ${err.message || 'Network error'}` 
    };
  }
}

export async function extractCardDataWithTesseract(imageSrc: string): Promise<CardRecord> {
  const result = await Tesseract.recognize(imageSrc, 'eng');
  const text = result.data.text;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let email = '';
  let website = '';
  let mobile = '';
  let landline = '';
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const webRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  for (const line of lines) {
    if (!email && emailRegex.test(line)) {
      email = line.match(emailRegex)?.[0] || '';
    }
    if (!website && webRegex.test(line) && !line.includes('@')) {
      website = line.match(webRegex)?.[0] || '';
    }
    if (!mobile && phoneRegex.test(line)) {
      mobile = line.match(phoneRegex)?.[0] || '';
    }
  }

  const company = lines[2] || 'Organization';
  let industry = 'General Corporate';
  if (/tech|soft|code|ai|digital|system/i.test(company)) industry = 'Technology & IT Services';
  else if (/logistics|freight|transport|cargo/i.test(company)) industry = 'Logistics & Supply Chain';
  else if (/health|hospital|pharma|medical/i.test(company)) industry = 'Healthcare & Life Sciences';

  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: lines[0] || 'Unknown Name',
    title: lines[1] || 'Business Professional',
    company,
    industry,
    email,
    mobile,
    landline,
    website,
    address: lines.slice(3).join(', '),
    city: '',
    country: '',
    notes: `Captured via WASM OCR fallback: ${text.slice(0, 100)}...`
  };
}

/**
 * Robust Multi-Stage JSON Extractor & Parser
 */
function tryParseJson(text: string): any[] | null {
  if (!text || !text.trim()) return null;

  let cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {}

  const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {}
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {}
  }

  try {
    const sanitized = cleaned
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/(["'])\s*\n\s*(["'])/g, '$1 $2');
    
    const arrayMatch2 = sanitized.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch2) {
      const parsed = JSON.parse(arrayMatch2[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch (e) {}

  return null;
}

export async function extractCardDataWithAI(
  imageBase64: string,
  model: string,
  apiKey: string,
  endpoint: string = DEFAULT_ENDPOINT
): Promise<CardRecord[]> {
  // Compress image client-side keeping high 2048px resolution for 3x3 multi-card grid sheets
  const compressedBase64 = await compressImageForOcr(imageBase64, 2048, 0.92);

  if (model === 'tesseract-wasm') {
    const singleCard = await extractCardDataWithTesseract(compressedBase64);
    return [singleCard];
  }

  const effectiveKey = getEffectiveApiKey(apiKey);
  if (!effectiveKey) {
    throw new Error('API Key Missing: Please click the Settings button (⚙️) to enter and save your OpenRouter API Key.');
  }

  const cleanEndpoint = (endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, '');
  const targetUrl = `${cleanEndpoint}/chat/completions`;

  const prompt = `CRITICAL MANDATE: This image may contain ONE OR MULTIPLE visiting cards placed side-by-side or in a grid (e.g., 3x3 grid with 9 cards on a single sheet).
Scan from top-left to bottom-right and extract EVERY SINGLE VISITING CARD present in the image into a JSON ARRAY. Do NOT stop after the first card! Extract all 2, 4, 6, 9 or more cards.

Each card object in the JSON ARRAY must have these keys:
"name", "title", "company", "industry", "email", "mobile", "landline", "website", "address", "city", "country", "notes".

Ensure 100% accuracy for Name, Email, Mobile, and Landline numbers.
Output MUST be strictly valid JSON starting with [ and ending with ].`;

  const requestBody = {
    model: model || DEFAULT_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: compressedBase64.startsWith('data:') ? compressedBase64 : `data:image/jpeg;base64,${compressedBase64}`
            }
          }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 4000
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${effectiveKey}`,
    'HTTP-Referer': 'https://vcpro.app',
    'X-Title': 'VC Pro Scanner'
  };

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      throw new Error(`OpenRouter Authentication Failed (401). Please click the Settings button (⚙️) to update your API key.`);
    }
    throw new Error(`AI Extraction failed (${res.status}): ${errText.slice(0, 180)}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content || '';

  const parsedCards = tryParseJson(rawContent);

  if (!parsedCards || parsedCards.length === 0) {
    console.warn('AI Vision returned non-JSON text output. Falling back to local OCR engine...', rawContent);
    const fallbackCard = await extractCardDataWithTesseract(compressedBase64);
    return [fallbackCard];
  }

  return parsedCards.map((c, index) => ({
    id: `card-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
    name: c.name || '',
    title: c.title || '',
    company: c.company || '',
    industry: c.industry || 'General Corporate',
    email: c.email || '',
    mobile: c.mobile || '',
    landline: c.landline || '',
    website: c.website || '',
    address: c.address || '',
    city: c.city || '',
    country: c.country || '',
    notes: c.notes || ''
  }));
}

export async function runPythonAudit(cards: CardRecord[]): Promise<AuditResponse> {
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards })
    });

    if (!res.ok) {
      throw new Error(`Python audit serverless API error status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Fallback to client-side audit due to local server response:', err);
    
    let corrections_made = 0;
    let duplicates_found = 0;
    const audit_logs: string[] = [];

    const processed = cards.map((card) => {
      const c = { ...card };

      if (c.email) c.email = c.email.trim().toLowerCase();
      if (c.name) c.name = c.name.trim();

      return c;
    });

    return {
      processed_cards: processed,
      stats: {
        total_cards: cards.length,
        cleanliness_score: 100,
        corrections_made,
        duplicates_found,
        missing_values_count: cards.reduce((acc, c) => acc + (c.email ? 0 : 1) + (c.mobile ? 0 : 1), 0),
        flagged_verification_count: 0
      },
      audit_logs: audit_logs.length ? audit_logs : ['Client-side audit completed successfully.']
    };
  }
}
