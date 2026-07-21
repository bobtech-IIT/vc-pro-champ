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
 * Robust JSON Extractor & Parser
 * Handles conversational text wrapper, trailing commas, linebreaks, and markdown blocks
 */
function tryParseJson(text: string): any[] | null {
  if (!text || !text.trim()) return null;

  // Step 1: Strip markdown block wrappers
  let cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

  // Step 2: Direct parse
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {}

  // Step 3: Extract JSON array using regex [ { ... } ]
  const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {}
  }

  // Step 4: Extract JSON object { ... }
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {}
  }

  // Step 5: Fix common JSON syntax errors (trailing commas, unescaped line breaks)
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
  if (model === 'tesseract-wasm') {
    const singleCard = await extractCardDataWithTesseract(imageBase64);
    return [singleCard];
  }

  const effectiveKey = getEffectiveApiKey(apiKey);
  if (!effectiveKey) {
    throw new Error('API Key Missing: Please click the Settings button (⚙️) to enter and save your OpenRouter API Key.');
  }

  const cleanEndpoint = (endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, '');
  const targetUrl = `${cleanEndpoint}/chat/completions`;

  const prompt = `You are a high-precision OCR and visiting card extraction engine. 
Scan the provided image carefully. The image may contain ONE OR MULTIPLE visiting cards.
Extract all details from each card into a JSON ARRAY of objects.

Each object in the array MUST have the exact following keys:
- "name": Full name of person
- "title": Job designation/title
- "company": Organization/Company name
- "industry": Inferred industry sector (e.g. Technology & IT Services, Logistics & Supply Chain, Healthcare & Life Sciences, Banking & Finance, Real Estate & Construction, Retail & E-Commerce, etc.)
- "email": Email address
- "mobile": Mobile/Cell number
- "landline": Office/Landline phone number
- "website": Website URL (verify domain carefully, do NOT include spaces or bad numbers)
- "address": Full street address (do NOT leak URLs or websites here)
- "city": City name if detected
- "country": Country name if detected
- "notes": Any extra info (e.g. social handles, services)

CRITICAL MANDATE: Output MUST be strictly valid JSON format only, starting with [ and ending with ]. Do NOT add conversational introductory or concluding text.`;

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
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    temperature: 0.1
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

  // Attempt robust JSON parsing
  const parsedCards = tryParseJson(rawContent);

  if (!parsedCards || parsedCards.length === 0) {
    console.warn('AI Vision returned non-JSON text output. Falling back to local OCR engine...', rawContent);
    const fallbackCard = await extractCardDataWithTesseract(imageBase64);
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
    
    // Client-Side Audit & Anomaly Detection Fallback
    let corrections_made = 0;
    let duplicates_found = 0;
    let flagged_count = 0;
    const audit_logs: string[] = [];

    const processed = cards.map((card, idx) => {
      const c = { ...card };
      const reasons: string[] = [];

      // Check website space / hallucination
      if (c.website) {
        if (c.website.includes(' ') || /000|2980|ecom/.test(c.website)) {
          reasons.push(`Suspicious website format: '${c.website}'`);
          audit_logs.push(`Row ${idx+1}: Flagged suspicious website: '${c.website}'`);
        }
      }

      // Check address URL leak
      if (c.address && /https?:\/\/|www\./i.test(c.address)) {
        reasons.push(`URL leaked inside Address field: '${c.address}'`);
        audit_logs.push(`Row ${idx+1}: Cleaned URL leak from address.`);
        c.address = c.address.replace(/https?:\/\/\S+|www\.\S+/gi, '').trim();
        corrections_made++;
      }

      // Check name/email match
      if (c.name && c.email && c.email.includes('@')) {
        const first = c.name.split(' ')[0].toLowerCase();
        const user = c.email.split('@')[0].toLowerCase();
        if (first.length > 3 && !user.includes(first.slice(0, 3))) {
          if (!/info|contact|admin|sales|office/.test(user)) {
            reasons.push(`Email username '${user}' might not match Name '${c.name}'`);
          }
        }
      }

      if (reasons.length > 0) {
        c.needs_verification = true;
        c.verification_reasons = reasons;
        flagged_count++;
      }

      return c;
    });

    return {
      processed_cards: processed,
      stats: {
        total_cards: cards.length,
        cleanliness_score: maxScore(cards.length, corrections_made, flagged_count),
        corrections_made,
        duplicates_found,
        missing_values_count: cards.reduce((acc, c) => acc + (c.email ? 0 : 1) + (c.mobile ? 0 : 1), 0),
        flagged_verification_count: flagged_count
      },
      audit_logs: audit_logs.length ? audit_logs : ['Client-side audit completed successfully.']
    };
  }
}

function maxScore(total: number, corrections: number, flagged: number): number {
  if (total === 0) return 100;
  return Math.max(20, Math.min(100, 100 - corrections * 2 - flagged * 5));
}
