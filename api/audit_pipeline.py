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
    (r'tech|soft|cloud|code|ai|cyber|data|digital|system|it\b|infotech', 'Technology & IT Services'),
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
    
    # Ensure expected standard columns exist
    expected_cols = [
        "name", "title", "company", "industry", "email", 
        "mobile", "landline", "website", "address", 
        "city", "country", "notes"
    ]
    for col in expected_cols:
        if col not in df.columns:
            df[col] = ""

    # Replace NaNs with empty string
    df = df.fillna("")

    audit_logs = []
    corrections_count = 0
    df['needs_verification'] = False
    df['verification_reasons'] = [[] for _ in range(len(df))]

    # 1. Critical Field 1: Email Normalization & Syntax Correction
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

    # 2. Critical Fields 2 & 3: Mobile Number & Landline Number Cleaning & Formatting
    for col in ['mobile', 'landline']:
        cleaned_phones = []
        for idx, row in df.iterrows():
            val = str(row[col]).strip()
            if val:
                # Remove extra noise characters while keeping valid phone formatting
                cleaned_val = re.sub(r"[^\d+()-\s.]", "", val).strip()
                if cleaned_val != val:
                    audit_logs.append(f"Row {idx+1}: Sanitized {col} phone format: '{val}' -> '{cleaned_val}'")
                    corrections_count += 1
                cleaned_phones.append(cleaned_val)
            else:
                cleaned_phones.append("")
        df[col] = cleaned_phones

    # 3. Critical Field 4: Name Normalization & Title Case Formatting
    cleaned_names = []
    for idx, row in df.iterrows():
        name = str(row['name']).strip()
        if name:
            # Strip numeric prefix noise from Name if present
            name_clean = re.sub(r"^\d+[\s.-]+", "", name).title()
            if name_clean != name:
                audit_logs.append(f"Row {idx+1}: Formatted Name: '{name}' -> '{name_clean}'")
                corrections_count += 1
            cleaned_names.append(name_clean)
        else:
            cleaned_names.append("")
    df['name'] = cleaned_names

    # 4. Website Formatting
    cleaned_websites = []
    for idx, row in df.iterrows():
        web = str(row['website']).strip().lower()
        if web:
            if not web.startswith("http://") and not web.startswith("https://") and ' ' not in web:
                web = "https://" + web
                corrections_count += 1
        cleaned_websites.append(web)
    df['website'] = cleaned_websites

    # 5. Address Leak Clean
    cleaned_addresses = []
    for idx, row in df.iterrows():
        addr = str(row['address']).strip()
        if addr:
            if re.search(r'https?://|www\.', addr, re.IGNORECASE):
                audit_logs.append(f"Row {idx+1}: Cleaned URL leak from address: '{addr}'")
                addr = re.sub(r'https?://\S+|www\.\S+', '', addr).strip(' ,')
                corrections_count += 1
        cleaned_addresses.append(addr)
    df['address'] = cleaned_addresses

    # 6. Industry Inference
    cleaned_industries = []
    for idx, row in df.iterrows():
        ind = str(row['industry']).strip()
        if not ind or ind == 'General Corporate / Services':
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

    # 8. Deduplication (Email, Phone, Name+Company)
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
