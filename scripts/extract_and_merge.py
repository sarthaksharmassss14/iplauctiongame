import pandas as pd
import pdfplumber
import json
import os

def extract_pdf_to_df(pdf_path):
    all_data = []
    print(f"Extracting from: {pdf_path}")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                table = page.extract_table()
                if table:
                    all_data.extend(table)
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return pd.DataFrame()
    return pd.DataFrame(all_data)

# File paths
file_retained = "public/1730381551643_IPL-2025-Retained-Players.pdf"
file_auction = "public/1731674068078_TATA IPL 2025- Auction List -15.11.24.pdf"

# Data extract
df_retained = extract_pdf_to_df(file_retained)
df_auction = extract_pdf_to_df(file_auction)

# Save Excel - use separate sheets
with pd.ExcelWriter("IPL_2025_Merged_List.xlsx") as writer:
    if not df_retained.empty:
        df_retained.to_excel(writer, sheet_name="Retained_Raw", index=False)
    if not df_auction.empty:
        df_auction.to_excel(writer, sheet_name="Auction_Raw", index=False)
print("Files successfully saved into IPL_2025_Merged_List.xlsx")

# --- Update players.json ---
final_players = []
seen_names = set()

junk_names = [
    'Player', 'Deduction', 'No of Players', 'IPL 2025 - Retained Players', 
    'No of Overseas Players', 'No of Uncapped Players', 'Total money spent', 
    'Total Retention Deduction', 'Salary cap available', 'C/U/A', 'Reserve Price Rs Lakh',
    'Specialism', 'Country', 'Surname', 'First Name', '2025 Set', 'Set No.', 'List Sr.No.'
]

def add_player(name, role, country, price, is_foreign):
    if not name or not isinstance(name, str): return
    clean_name = name.replace('*', '').strip()
    if clean_name and clean_name not in seen_names and len(clean_name) > 3 and clean_name not in junk_names:
        final_players.append({
            "id": len(final_players) + 1,
            "name": clean_name,
            "role": role,
            "country": country,
            "basePrice": price,
            "isForeign": is_foreign,
            "status": "unsold",
            "soldPrice": 0,
            "teamId": None,
            "stats": {"matches": 0, "runs": 0, "wickets": 0}
        })
        seen_names.add(clean_name)

# Process Retained
if not df_retained.empty:
    for rowIndex, row in df_retained.iterrows():
        for val in row:
            if val and isinstance(val, str) and not val.isdigit():
                add_player(val, "Batsman", "India", 200, '*' in val)

# Process Auction
if not df_auction.empty:
    header_row = -1
    for i, row in df_auction.iterrows():
        if any("First Name" in str(x) for x in row):
            header_row = i
            break
    
    if header_row != -1:
        cols = [str(c).strip() for c in df_auction.iloc[header_row]]
        data = df_auction.iloc[header_row+1:]
        
        fname_idx = -1
        lname_idx = -1
        role_idx = -1
        country_idx = -1
        price_idx = -1
        
        for i, col in enumerate(cols):
            if "First Name" in col: fname_idx = i
            elif "Surname" in col: lname_idx = i
            elif "Specialism" in col: role_idx = i
            elif "Country" in col: country_idx = i
            elif "Reserve Price" in col: price_idx = i

        for _, row in data.iterrows():
            fname = str(row[fname_idx]) if fname_idx != -1 else ""
            lname = str(row[lname_idx]) if lname_idx != -1 else ""
            full_name = f"{fname} {lname}".strip()
            if full_name and "nan" not in full_name.lower():
                country = str(row[country_idx]) if country_idx != -1 else "India"
                role_raw = str(row[role_idx]).upper() if role_idx != -1 else "BATSMAN"
                role = "Batsman"
                if "WICKET" in role_raw: role = "Wicketkeeper"
                elif "BOWL" in role_raw: role = "Bowler"
                elif "ALL" in role_raw: role = "All-rounder"
                
                try:
                    price_str = str(row[price_idx]).replace(',', '')
                    price = int(price_str) if price_idx != -1 else 30
                except: price = 30
                
                add_player(full_name, role, country, price, country.lower() != "india")

with open('src/data/players.json', 'w') as f:
    json.dump(final_players, f, indent=2)

print(f"Successfully populated players.json with {len(final_players)} real players.")
