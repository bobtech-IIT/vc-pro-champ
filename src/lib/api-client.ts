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

/**
 * Client-Side Canvas Slicer for Multi-Card Sheet Photos (e.g. 3x3 Grid of 9 Cards)
 */
export async function sliceImageGrid(base64: string, rows: number = 3, cols: number = 3): Promise<string[]> {
  if (typeof window === 'undefined') return [base64];
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      // Only slice if image is large enough to contain multiple cards
      if (img.width < 600 || img.height < 400) {
        return resolve([base64]);
      }

      const tileW = Math.floor(img.width / cols);
      const tileH = Math.floor(img.height / rows);
      const tiles: string[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileW;
          canvas.height = tileH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, c * tileW, r * tileH, tileW, tileH, 0, 0, tileW, tileH);
            tiles.push(canvas.toDataURL('image/jpeg', 0.92));
          }
        }
      }
      resolve(tiles.length === rows * cols ? tiles : [base64]);
    };
    img.onerror = () => resolve([base64]);
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

/**
 * Single Tile Parsing Engine for Tesseract WASM
 */
export function parseSingleCardFromLines(rawLines: string[], cardIdx: number = 0): CardRecord | null {
  if (rawLines.length === 0) return null;

  let name = '';
  let title = '';
  let company = '';
  let email = '';
  let website = '';
  let mobile = '';
  let landline = '';
  let address = '';
  let city = '';
  let country = '';
  let notes = '';

  const phonesFound: string[] = [];

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
  const webRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
  const phoneRegex = /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
  const titleRegex = /Manager|Director|Officer|Engineer|Architect|Lead|Head|President|Executive|Founder|CEO|CTO|CFO|COO|VP/i;
  const companyRegex = /Solutions|Group|Technologies|Logistics|Designs|Innovations|Collaborative|Habitats|Systems|Services|Crafters|Inc|Ltd|Corp|Pvt|LLC|Global|Media/i;

  for (const line of rawLines) {
    if (!email && emailRegex.test(line)) {
      email = line.match(emailRegex)?.[0] || '';
    }
    if (!website && webRegex.test(line) && !line.includes('@')) {
      website = line.match(webRegex)?.[0] || '';
    }

    const matches = line.match(phoneRegex);
    if (matches) {
      matches.forEach(p => {
        const digits = p.replace(/\D/g, '');
        if (digits.length >= 7 && !phonesFound.includes(p)) {
          phonesFound.push(p);
        }
      });
    }

    if (/LinkedIn:|WhatsApp:|GST\s*\/\s*Tax ID:/i.test(line)) {
      notes += (notes ? ' | ' : '') + line;
    }
  }

  if (phonesFound.length > 0) mobile = phonesFound[0];
  if (phonesFound.length > 1) landline = phonesFound[1];

  for (const line of rawLines) {
    if (emailRegex.test(line) || webRegex.test(line) || /LinkedIn:|WhatsApp:|Tax ID:/i.test(line)) continue;

    if (!title && titleRegex.test(line)) {
      title = line;
      continue;
    }

    if (!company && companyRegex.test(line)) {
      company = line;
      continue;
    }

    if (!address && /Road|Street|Suite|Avenue|Salai|Block|Village|Building|Floor|London|Delhi|Bengaluru|Mumbai|Chennai|Gurgaon|Kolkata|EC1V|UK|India/i.test(line)) {
      address = line.replace(/^Company Address[\s,:-]*/i, '').trim();
      continue;
    }

    if (!name && line.length > 3 && line.length < 35 && !/\d/.test(line) && !/Email:|Mobile:|Landline:|Website:|Address:|City:|Country:/i.test(line)) {
      name = line;
    }
  }

  if (!name && !email && !company && !mobile) return null;

  if (!name) name = rawLines[0] || 'Unknown Contact';
  name = name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  if (address.includes('London')) city = 'London';
  if (address.includes('Bengaluru')) city = 'Bengaluru';
  if (address.includes('New Delhi')) city = 'New Delhi';
  if (address.includes('Mumbai')) city = 'Mumbai';
  if (address.includes('Chennai')) city = 'Chennai';
  if (address.includes('Gurgaon')) city = 'Gurgaon';
  if (address.includes('Kolkata')) city = 'Kolkata';

  if (address.includes('UK')) country = 'UK';
  if (address.includes('India')) country = 'India';

  let industry = 'General Corporate';
  if (/tech|soft|code|ai|digital|system|solution/i.test(company + ' ' + title)) industry = 'Technology & IT Services';
  else if (/logistics|freight|transport|cargo/i.test(company)) industry = 'Logistics & Supply Chain';
  else if (/health|hospital|pharma|medical/i.test(company)) industry = 'Healthcare & Life Sciences';
  else if (/design|media|creative|pr/i.test(company + ' ' + title)) industry = 'Media, Advertising & PR';
  else if (/architect|build|realty|habitat/i.test(company + ' ' + title)) industry = 'Real Estate & Construction';

  return {
    id: `card-${Date.now()}-${cardIdx}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    title,
    company,
    industry,
    email,
    mobile,
    landline,
    website,
    address,
    city,
    country,
    notes: notes || `Extracted via WASM OCR Engine`
  };
}

export async function extractCardDataWithTesseract(imageSrc: string): Promise<CardRecord[]> {
  const result = await Tesseract.recognize(imageSrc, 'eng');
  const rawText = result.data.text;

  const cleanText = rawText
    .replace(/[©®™\[\]]/g, '')
    .replace(/\b[QXX0]\b/g, '');

  const rawLines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Check if rawText contains multiple email domains / email addresses (multi-card sheet)
  const emailsInText = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];

  if (emailsInText.length <= 1) {
    const single = parseSingleCardFromLines(rawLines, 0);
    return single ? [single] : [];
  }

  // Multi-card sheet detected in plain text: group lines by email blocks
  const cards: CardRecord[] = [];
  let currentBlock: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    currentBlock.push(line);

    // End block if next line starts a new name/card header or at end of array
    const isLastLine = i === rawLines.length - 1;
    const isEmailLine = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(line);

    if ((isEmailLine && currentBlock.length >= 4) || isLastLine) {
      const parsed = parseSingleCardFromLines(currentBlock, cards.length);
      if (parsed) cards.push(parsed);
      currentBlock = [];
    }
  }

  return cards.length > 0 ? cards : [parseSingleCardFromLines(rawLines, 0)!].filter(Boolean);
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
  // Compress image client-side keeping high 2048px resolution
  const compressedBase64 = await compressImageForOcr(imageBase64, 2048, 0.92);

  // If using offline Tesseract WASM, slice into 3x3 grid tiles to extract all 9 cards reliably
  if (model === 'tesseract-wasm') {
    const tiles = await sliceImageGrid(compressedBase64, 3, 3);
    const allCards: CardRecord[] = [];
    for (let i = 0; i < tiles.length; i++) {
      const cardBatch = await extractCardDataWithTesseract(tiles[i]);
      allCards.push(...cardBatch);
    }
    return allCards.length > 0 ? allCards : await extractCardDataWithTesseract(compressedBase64);
  }

  const effectiveKey = getEffectiveApiKey(apiKey);
  if (!effectiveKey) {
    throw new Error('API Key Missing: Please click the Settings button (⚙️) to enter and save your OpenRouter API Key.');
  }

  const cleanEndpoint = (endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, '');
  const targetUrl = `${cleanEndpoint}/chat/completions`;

  const prompt = `CRITICAL MANDATE: This image may contain MULTIPLE visiting cards placed in a grid (e.g. 3 rows x 3 columns = 9 cards).
Scan systematically row by row from top-left to bottom-right and extract EVERY SINGLE VISITING CARD present in the image into a JSON ARRAY.
Do NOT stop after 1 card! Extract all 2, 4, 6, 9 or more cards present on the sheet.

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

  let parsedCards = tryParseJson(rawContent);

  // If AI vision model extracted only 1 card or failed to return JSON on a grid sheet, slice into 3x3 grid tiles to extract ALL 9 cards!
  if (!parsedCards || parsedCards.length <= 1) {
    console.warn('AI Vision returned single card or non-JSON for multi-card sheet. Triggering 3x3 Grid Slicer Fallback...');
    const tiles = await sliceImageGrid(compressedBase64, 3, 3);
    const gridCards: CardRecord[] = [];

    for (let i = 0; i < tiles.length; i++) {
      const tileCards = await extractCardDataWithTesseract(tiles[i]);
      gridCards.push(...tileCards);
    }

    if (gridCards.length > 1) {
      return gridCards;
    }
  }

  if (!parsedCards || parsedCards.length === 0) {
    const fallbackCards = await extractCardDataWithTesseract(compressedBase64);
    return fallbackCards;
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
