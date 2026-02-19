import requests
from bs4 import BeautifulSoup
import json
import time

def scrape_players():
    url = "https://www.jagranjosh.com/general-knowledge/ipl-2025-mega-auction-players-list-1731668472-1"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    players = []
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch Jagran Josh: {response.status_code}")
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        # Find tables. Usually the list is in a table.
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows[1:]: # Skip header
                cols = row.find_all('td')
                if len(cols) >= 2:
                    name = cols[1].text.strip()
                    # Some tables have S.No, Name, Country, Role, Base Price
                    role = cols[3].text.strip() if len(cols) > 3 else "Unknown"
                    country = cols[2].text.strip() if len(cols) > 2 else "Unknown"
                    base_price = cols[4].text.strip() if len(cols) > 4 else "0"
                    
                    if name and name != "Name":
                        players.append({
                            "name": name,
                            "role": role,
                            "country": country,
                            "basePrice": base_price
                        })
        return players
    except Exception as e:
        print(f"Error scraping: {e}")
        return []

if __name__ == "__main__":
    player_list = scrape_players()
    if player_list:
        print(f"Scraped {len(player_list)} players.")
        # Save to a temporary file
        with open("raw_players.json", "w") as f:
            json.dump(player_list, f, indent=2)
    else:
        print("No players found.")
