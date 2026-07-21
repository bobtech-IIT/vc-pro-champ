import re
import pandas as pd
import numpy as np
from typing import List, Dict, Any

COMMON_EMAIL_DOMAINS = {
    'gamil.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
}

STANDARD_DESIGNATIONS = {
    'ceo': 'Chief Executive Officer (CEO)',
    'cto': 'Chief Technology Officer (CTO)',
    'cfo': 'Chief Financial Officer (CFO)',
    'coo': 'Chief Operating Officer (COO)',
    'vp': 'Vice President',
    'dir': 'Director',
    'mgr': 'Manager',
    'dev': 'Developer',
    'eng': 'Engineer',
}

INDUSTRY_KEYWORDS = [
    (r'logistics|transport|freight|cargo|shipping|express|supply chain', 'Logistics & Supply Chain'),
    (r'tech|soft|cloud|code|ai|cyber|data|digital|system|it\b|infotech|solution', 'Technology & IT Services'),
    (r'health|hospital|pharma|clinic|medical|doctor|care|bio', 'Healthcare & Life Sciences'),
    (r'fintech|bank|capital|invest|finance|wealth|credit|insur|equity', 'Banking & Financial Services'),
    (r'build|construct|real estate|realty|architect|property|housing', 'Real Estate & Construction'),
    (r'retail|ecom|store|shop|mart|brand|consumer|fmcg', 'Retail & E-Commerce'),
    (r'media|studio|creative|ad\b|marketing|pr\b|design|film', 'Media, Advertising & PR'),
    (r'consult|advisory|manage|strata|hr\b|staffing', 'Professional Consulting & HR'),
    (r'auto|motor|vehicle|drive|ev\b|mobility', 'Automotive & Mobility'),
    (r'law|legal|attorney|advocate|solicitor', 'Legal Services'),
    (r'edu|school|college|train|academy|learn|university', 'Education & EdTech'),
    (r'food|beverage|cafe|restaurant|hotel|hospitality|resort', 'Hospitality, Food & Tourism'),
    (r'energy|solar|power|oil|gas|wind|clean|environment', 'Energy & Renewable Resources'),
    (r'manufac|factory|steel|metal|industrial|plant|machinery', 'Manufacturing & Industrial')
]

KNOWN_CITIES = [
    'London', 'New Delhi', 'Bengaluru', 'Mumbai', 'Chennai', 'Gurgaon', 'Kolkata', 'Pune', 
    'New York', 'San Francisco', 'Singapore', 'Dubai', 'Berlin', 'Tokyo', 'Sydney', 'Hyderabad'
]

KNOWN_COUNTRIES = [
    'UK', 'United Kingdom', 'India', 'USA', 'United States', 'Singapore', 'UAE', 'Germany', 
    'Japan', 'Australia', 'Canada', 'France'
]

def clean_ocr_symbols(text: str) -> str:
    if not text:
        return ""
    # Remove OCR glyph icons and noise (e.g. ©, [0, Q, XX, @ at start)
    cleaned = re.sub(r"[©®™\[\]]", "", text)
    cleaned = re.sub(r"\b[QXX0]\b", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.-:")
    return cleaned

def infer_industry(company: str, title: str, notes: str) -> str:
    text = f"{company} {title} {notes}".lower()
    for pattern, industry in INDUSTRY_KEYWORDS:
        if re.search(pattern, text):
            return industry
    return "General Corporate / Services"

def clean_and_audit_cards(cards_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not cards_data:
        return {
            "processed_cards": [],
            "stats": {
                "total_cards": 0,
                "cleanliness_score": 100,
                "corrections_made": 0,
                "duplicates_found": 0,
                "missing_values_count": 0,
                "flagged_verification_count": 0
            },
            "audit_logs": []
        }

    df = pd.DataFrame(cards_data)
    
    expected_cols = [
        "name", "title", "company", "industry", "email", 
        "mobile", "landline", "website", "address", 
        "city", "country", "notes"
    ]
    for col in expected_cols:
        if col not in df.columns:
            df[col] = ""

    df = df.fillna("")

    audit_logs = []
    corrections_count = 0
    df['needs_verification'] = False
    df['verification_reasons'] = [[] for _ in range(len(df))]

    # 1. Clean Symbol Noise across all fields
    for col in expected_cols:
        cleaned_col = []
        for idx, row in df.iterrows():
            val = str(row[col])
            clean_val = clean_ocr_symbols(val)
            if clean_val != val and col not in ['address', 'notes']:
                corrections_count += 1
            cleaned_col.append(clean_val)
        df[col] = cleaned_col

    # 2. Extract Leaked Emails, Websites, Phones, & Notes from Address Field
    for idx, row in df.iterrows():
        addr = str(row['address']).strip()
        email = str(row['email']).strip()
        website = str(row['website']).strip()
        mobile = str(row['mobile']).strip()
        landline = str(row['landline']).strip()
        notes = str(row['notes']).strip()
        city = str(row['city']).strip()
        country = str(row['country']).strip()

        if addr:
          # Remove "Company Address" prefix label
          addr = re.sub(r"^Company Address[\s,:-]*", "", addr, flags=re.IGNORECASE).strip()

          # Extract Leaked Email from Address
          email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", addr)
          if email_match:
              if not email:
                  df.at[idx, 'email'] = email_match.group(0).lower()
                  audit_logs.append(f"Row {idx+1}: Extracted email '{email_match.group(0)}' from Address.")
                  corrections_count += 1
              addr = addr.replace(email_match.group(0), "").strip()

          # Extract Leaked Website from Address
          web_match = re.search(r"(https?://)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", addr)
          if web_match and not web_match.group(0).startswith("http") and not email_match:
              if not website:
                  df.at[idx, 'website'] = web_match.group(0).lower()
                  audit_logs.append(f"Row {idx+1}: Extracted website '{web_match.group(0)}' from Address.")
                  corrections_count += 1
              addr = addr.replace(web_match.group(0), "").strip()

          # Extract Leaked Phone Numbers from Address
          phones = re.findall(r"\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}", addr)
          for phone_str in phones:
              p_clean = re.sub(r"[^\d+]", "", phone_str)
              if len(p_clean) >= 7:
                  if not mobile:
                      df.at[idx, 'mobile'] = phone_str
                      audit_logs.append(f"Row {idx+1}: Extracted mobile phone '{phone_str}' from Address.")
                      corrections_count += 1
                  elif not landline and phone_str != mobile:
                      df.at[idx, 'landline'] = phone_str
                      audit_logs.append(f"Row {idx+1}: Extracted landline phone '{phone_str}' from Address.")
                      corrections_count += 1
                  addr = addr.replace(phone_str, "").strip()

          # Extract Extra Notes (LinkedIn, WhatsApp, Tax ID) from Address
          notes_matches = re.findall(r"(LinkedIn:[^\s,]+|WhatsApp:[^\s,]+|GST\s*/\s*Tax ID:[^,]+)", addr, re.IGNORECASE)
          if notes_matches:
              extracted_notes = " | ".join(notes_matches)
              df.at[idx, 'notes'] = f"{notes} | {extracted_notes}".strip(" |")
              for nm in notes_matches:
                  addr = addr.replace(nm, "").strip()
              corrections_count += 1

          # Clean remaining address noise
          addr = re.sub(r"[\s,.-]+", " ", addr).strip(" ,.-")
          df.at[idx, 'address'] = addr

        # Extract City & Country if empty
        if not city:
            for c in KNOWN_CITIES:
                if re.search(r"\b" + re.escape(c) + r"\b", addr, re.IGNORECASE):
                    df.at[idx, 'city'] = c
                    audit_logs.append(f"Row {idx+1}: Inferred City '{c}' from Address.")
                    corrections_count += 1
                    break

        if not country:
            for co in KNOWN_COUNTRIES:
                if re.search(r"\b" + re.escape(co) + r"\b", addr, re.IGNORECASE):
                    df.at[idx, 'country'] = co
                    audit_logs.append(f"Row {idx+1}: Inferred Country '{co}' from Address.")
                    corrections_count += 1
                    break

    # 3. Email Normalization
    cleaned_emails = []
    for idx, row in df.iterrows():
        email = str(row['email']).strip().lower()
        if email:
            domain_parts = email.split('@')
            if len(domain_parts) == 2:
                user, dom = domain_parts
                if dom in COMMON_EMAIL_DOMAINS:
                    fixed_dom = COMMON_EMAIL_DOMAINS[dom]
                    email = f"{user}@{fixed_dom}"
                    audit_logs.append(f"Row {idx+1}: Corrected email domain '{dom}' -> '{fixed_dom}'")
                    corrections_count += 1
        cleaned_emails.append(email)
    df['email'] = cleaned_emails

    # 4. Name Cleanup (Separating logo/company name if attached to Name)
    cleaned_names = []
    for idx, row in df.iterrows():
        name = str(row['name']).strip()
        company = str(row['company']).strip()

        # If name has Company prepended like "AXELOR GLOBAL SOLUTIONS ALEXANDER CHEN"
        if company and company.lower() in name.lower() and len(name) > len(company):
            name_clean = name.lower().replace(company.lower(), "").strip().title()
            if name_clean:
                audit_logs.append(f"Row {idx+1}: Separated Company name from Name: '{name}' -> '{name_clean}'")
                name = name_clean
                corrections_count += 1

        name = re.sub(r"^\d+[\s.-]+", "", name).title()
        cleaned_names.append(name)
    df['name'] = cleaned_names

    # 5. Website Formatting
    cleaned_websites = []
    for idx, row in df.iterrows():
        web = str(row['website']).strip().lower()
        if web:
            if not web.startswith("http://") and not web.startswith("https://") and ' ' not in web:
                web = "https://" + web
                corrections_count += 1
        cleaned_websites.append(web)
    df['website'] = cleaned_websites

    # 6. Industry Inference
    cleaned_industries = []
    for idx, row in df.iterrows():
        ind = str(row['industry']).strip()
        if not ind or ind == 'General Corporate / Services' or ind == 'General Corporate':
            ind = infer_industry(str(row['company']), str(row['title']), str(row['notes']))
        cleaned_industries.append(ind)
    df['industry'] = cleaned_industries

    # 7. Designation Match
    cleaned_titles = []
    for idx, row in df.iterrows():
        title = str(row['title']).strip()
        if title.lower() in STANDARD_DESIGNATIONS:
            title = STANDARD_DESIGNATIONS[title.lower()]
            corrections_count += 1
        cleaned_titles.append(title.title() if title else "")
    df['title'] = cleaned_titles

    # 8. Deduplication
    duplicates_count = 0
    df['is_duplicate'] = False
    
    seen_keys = set()
    for idx, row in df.iterrows():
        key_email = str(row['email']).strip().lower()
        key_phone = re.sub(r"\D", "", str(row['mobile']))
        key_name_co = f"{row['name'].strip().lower()}|{row['company'].strip().lower()}"
        
        is_dup = False
        if key_email and key_email in seen_keys:
            is_dup = True
        elif key_phone and len(key_phone) > 7 and key_phone in seen_keys:
            is_dup = True
        elif key_name_co != '|' and key_name_co in seen_keys:
            is_dup = True

        if is_dup:
            df.at[idx, 'is_duplicate'] = True
            duplicates_count += 1
            audit_logs.append(f"Row {idx+1}: Identified duplicate record for '{row['name']}' ({row['company']})")
        else:
            if key_email: seen_keys.add(key_email)
            if key_phone and len(key_phone) > 7: seen_keys.add(key_phone)
            if key_name_co != '|': seen_keys.add(key_name_co)

    # 9. Completeness Score
    total_fields = len(df) * len(expected_cols)
    empty_fields = (df[expected_cols] == "").sum().sum()
    missing_count = int(empty_fields)
    
    cleanliness_score = max(50, int(100 - (missing_count / max(1, total_fields) * 30) - (duplicates_count * 2)))

    processed_list = df.to_dict(orient="records")

    return {
        "processed_cards": processed_list,
        "stats": {
            "total_cards": len(df),
            "cleanliness_score": min(100, max(0, cleanliness_score)),
            "corrections_made": corrections_count,
            "duplicates_found": duplicates_count,
            "missing_values_count": missing_count,
            "flagged_verification_count": 0
        },
        "audit_logs": audit_logs
    }
