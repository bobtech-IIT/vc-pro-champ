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

def clean_and_audit_cards(cards_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not cards_data:
        return {
            "processed_cards": [],
            "stats": {
                "total_cards": 0,
                "cleanliness_score": 100,
                "corrections_made": 0,
                "duplicates_found": 0,
                "missing_values_count": 0
            },
            "audit_logs": []
        }

    df = pd.DataFrame(cards_data)
    
    # Ensure expected standard columns exist
    expected_cols = [
        "name", "title", "company", "email", 
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

    # 1. Email Normalization & Syntax Check
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
                    audit_logs.append(f"Row {idx+1}: Corrected email domain typo '{dom}' -> '{fixed_dom}'")
                    corrections_count += 1
            if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
                audit_logs.append(f"Row {idx+1}: Email '{email}' syntax flagged as unusual.")
        cleaned_emails.append(email)
    df['email'] = cleaned_emails

    # 2. Phone Formatting (Mobile & Landline)
    for col in ['mobile', 'landline']:
        cleaned_phones = []
        for idx, row in df.iterrows():
            val = str(row[col]).strip()
            if val:
                # Keep digits, +, -, and spaces
                digits_only = re.sub(r"[^\d+]", "", val)
                if len(digits_only) >= 7:
                    cleaned_phones.append(val)
                else:
                    cleaned_phones.append(val)
                    audit_logs.append(f"Row {idx+1}: Short phone number in field '{col}': '{val}'")
            else:
                cleaned_phones.append("")
        df[col] = cleaned_phones

    # 3. Name Normalization
    cleaned_names = []
    for idx, row in df.iterrows():
        name = str(row['name']).strip()
        if name:
            # Check for numbers in name
            if re.search(r"\d", name):
                audit_logs.append(f"Row {idx+1}: Name contains numeric digits: '{name}'")
            name = name.title()
        cleaned_names.append(name)
    df['name'] = cleaned_names

    # 4. Website Formatting
    cleaned_websites = []
    for idx, row in df.iterrows():
        web = str(row['website']).strip().lower()
        if web and not web.startswith("http://") and not web.startswith("https://"):
            web = "https://" + web
            corrections_count += 1
        cleaned_websites.append(web)
    df['website'] = cleaned_websites

    # 5. Company Name Standardization
    cleaned_companies = []
    for idx, row in df.iterrows():
        comp = str(row['company']).strip()
        if comp:
            comp = re.sub(r"\bInc\b\.?", "Inc.", comp, flags=re.IGNORECASE)
            comp = re.sub(r"\bLlc\b\.?", "LLC", comp, flags=re.IGNORECASE)
            comp = re.sub(r"\bPvt Ltd\b\.?", "Pvt. Ltd.", comp, flags=re.IGNORECASE)
        cleaned_companies.append(comp)
    df['company'] = cleaned_companies

    # 6. Designation Match
    cleaned_titles = []
    for idx, row in df.iterrows():
        title = str(row['title']).strip()
        if title.lower() in STANDARD_DESIGNATIONS:
            title = STANDARD_DESIGNATIONS[title.lower()]
            corrections_count += 1
        cleaned_titles.append(title.title() if title else "")
    df['title'] = cleaned_titles

    # 7 & 8. Missing Field Scoring & Completeness Score
    total_fields = len(df) * len(expected_cols)
    empty_fields = (df[expected_cols] == "").sum().sum()
    missing_count = int(empty_fields)
    
    cleanliness_score = max(10, int(100 - (missing_count / max(1, total_fields) * 40) - (len(audit_logs) * 2)))

    # 9. Email-Domain Cross Verification
    for idx, row in df.iterrows():
        em = row['email']
        web = row['website']
        if em and '@' in em and web:
            em_domain = em.split('@')[1]
            web_clean = web.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
            if em_domain not in web_clean and web_clean not in em_domain:
                if not any(provider in em_domain for provider in ['gmail', 'yahoo', 'hotmail', 'outlook']):
                    audit_logs.append(f"Row {idx+1}: Email domain '{em_domain}' differs from website domain '{web_clean}'.")

    # 10. Duplicate Detection
    duplicates_count = 0
    df['is_duplicate'] = False
    
    # Check duplicate emails
    email_counts = df['email'].value_counts()
    dup_emails = set(email_counts[email_counts > 1].index) - {""}
    if dup_emails:
        for idx, row in df.iterrows():
            if row['email'] in dup_emails:
                df.at[idx, 'is_duplicate'] = True
                duplicates_count += 1
                audit_logs.append(f"Row {idx+1}: Duplicate email found '{row['email']}'")

    processed_list = df.to_dict(orient="records")

    return {
        "processed_cards": processed_list,
        "stats": {
            "total_cards": len(df),
            "cleanliness_score": min(100, max(0, cleanliness_score)),
            "corrections_made": corrections_count,
            "duplicates_found": duplicates_count,
            "missing_values_count": missing_count
        },
        "audit_logs": audit_logs
    }
