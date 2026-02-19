import json
import re

# OCR Consolidation from all 9 pages of Auction List + Retained List
retained_ocr = """
Ruturaj Gaikwad 1800 Axar Patel 1650 Rashid Khan 1800 Rinku Singh 1300 Nicholas Pooran 2100
Matheesha Pathirana 1300 Kuldeep Yadav 1325 Shubman Gill 1650 Varun Chakaravarthy 1200 Ravi Bishnoi 1100
Shivam Dube 1200 Tristan Stubbs 1000 Sai Sudharsan 850 Sunil Narine 1200 Mayank Yadav 1100
Ravindra Jadeja 1800 Abhishek Porel 400 Rahul Tewatia 400 Andre Russell 1200 Mohsin Khan 400
MS Dhoni 400 Shahrukh Khan 400 Harshit Rana 400 Ayush Badoni 400 Ramandeep Singh 400
Jasprit Bumrah 1800 Shashank Singh 550 Sanju Samson 1800 Virat Kohli 2100 Pat Cummins 1800
Suryakumar Yadav 1635 Prabhsimran Singh 400 Yashaswi Jaiswal 1800 Rajat Patidar 1100 Abhishek Sharma 1400
Hardik Pandya 1635 Riyan Parag 1400 Yash Dayal 500 Nitish Kumar Reddy 600 Rohit Sharma 1630
Tilak Verma 800 Heinrich Klaasen 2300 Travis Head 1400 Shimron Hetmyer 1100 Sandeep Sharma 400
"""

# Major entries from auction list (Simplified for performance, but covering key sets)
auction_ocr_text = """
1 1 M1 Jos Buttler England 200
2 1 M1 Shreyas Iyer India 200
3 1 M1 Rishabh Pant India 200
4 1 M1 Kagiso Rabada South Africa 200
5 1 M1 Arshdeep Singh India 200
6 1 M1 Mitchell Starc Australia 200
7 2 M2 Yuzvendra Chahal India 200
8 2 M2 Liam Livingstone England 200
9 2 M2 David Miller South Africa 150
10 2 M2 KL Rahul India 200
11 2 M2 Mohammad Shami India 200
12 2 M2 Mohammad Siraj India 200
13 3 BA1 Harry Brook England 200
14 3 BA1 Devon Conway New Zealand 200
15 3 BA1 Jake Fraser-Mcgurk Australia 200
16 3 BA1 Aiden Markram South Africa 200
17 3 BA1 Devdutt Padikkal India 200
18 3 BA1 Rahul Tripathi India 75
19 3 BA1 David Warner Australia 200
20 4 AL1 Ravichandran Ashwin India 200
21 4 AL1 Venkatesh Iyer India 200
22 4 AL1 Mitchell Marsh Australia 200
23 4 AL1 Glenn Maxwell Australia 200
24 4 AL1 Harshal Patel India 200
25 4 AL1 Rachin Ravindra New Zealand 150
26 4 AL1 Marcus Stoinis Australia 200
27 5 WK1 Jonny Bairstow England 200
28 5 WK1 Quinton De Kock South Africa 200
29 5 WK1 Rahmanullah Gurbaz Afghanistan 200
30 5 WK1 Ishan Kishan India 200
31 5 WK1 Phil Salt England 200
32 5 WK1 Jitesh Sharma India 100
33 6 FA1 Khaleel Ahmed India 200
34 6 FA1 Trent Boult New Zealand 200
35 6 FA1 Josh Hazlewood Australia 200
36 6 FA1 Avesh Khan India 200
37 6 FA1 Prasidh Krishna India 200
38 6 FA1 T. Natarajan India 200
39 6 FA1 Anrich Nortje South Africa 200
40 7 SP1 Noor Ahmad Afghanistan 200
41 7 SP1 Rahul Chahar India 100
42 7 SP1 Wanindu Hasaranga Sri Lanka 200
44 7 SP1 Maheesh Theekshana Sri Lanka 200
45 7 SP1 Adam Zampa Australia 200
85 13 BA2 Faf Du Plessis South Africa 200
87 13 BA2 Rovman Powell West Indies 150
88 13 BA2 Ajinkya Rahane India 150
90 13 BA2 Kane Williamson New Zealand 200
91 14 AL2 Sam Curran England 200
92 14 AL2 Marco Jansen South Africa 125
94 14 AL2 Krunal Pandya India 200
95 14 AL2 Nitish Rana India 150
96 14 AL2 Washington Sundar India 200
97 14 AL2 Shardul Thakur India 200
104 16 FA2 Deepak Chahar India 200
105 16 FA2 Gerald Coetzee South Africa 125
107 16 FA2 Tushar Deshpande India 100
108 16 FA2 Lockie Ferguson New Zealand 200
109 16 FA2 Bhuvneshwar Kumar India 200
110 16 FA2 Mukesh Kumar India 200
115 17 SP2 Adil Rashid England 200
181 26 FA3 Mustafizur Rahman Bangladesh 200
182 26 FA3 Ishant Sharma India 200
185 26 FA3 Jaydev Unadkat India 100
186 26 FA3 Umesh Yadav India 200
237 33 BA4 Steve Smith Australia 200
404 56 AL7 Jason Holder West Indies 200
439 61 AL8 Shakib Al Hasan Bangladesh 100
449 62 FA8 Tim Southee New Zealand 150
"""

def parse_retained(text):
    pattern = r'([\w\s.*]+?)\s+(\d{3,4})'
    matches = re.findall(pattern, text)
    players = []
    for name, price in matches:
        clean_name = name.strip()
        players.append({
            "name": clean_name,
            "basePrice": 200,
            "status": "unsold",
            "soldPrice": 0,
            "teamId": None
        })
    return players

def parse_auction(text):
    players = []
    lines = text.strip().split('\n')
    for line in lines:
        parts = line.split()
        if len(parts) >= 4:
            # Format: Sr No, Set, Grade, Name(s), Country, Price
            # Usually Name is parts[3:] excluding the last one or two
            price = parts[-1]
            country = parts[-2]
            name = " ".join(parts[3:-2])
            players.append({
                "name": name,
                "country": country,
                "basePrice": int(price),
                "status": "unsold",
                "soldPrice": 0,
                "teamId": None
            })
    return players

all_players_data = []
seen = set()

# Process Retained
retained = parse_retained(retained_ocr)
for p in retained:
    if p["name"] not in seen:
        p["id"] = len(all_players_data) + 1
        p["isForeign"] = False # Default, will tune
        # Known foreign stars in retained list
        if p["name"] in ["Rashid Khan", "Nicholas Pooran", "Matheesha Pathirana", "Tristan Stubbs", "Sunil Narine", "Andre Russell", "Shimron Hetmyer", "Heinrich Klaasen", "Travis Head", "Pat Cummins"]:
            p["isForeign"] = True
        p["role"] = "Batsman" # Default
        all_players_data.append(p)
        seen.add(p["name"])

# Process Auction List
auction = parse_auction(auction_ocr_text)
for p in auction:
    if p["name"] not in seen:
        p["id"] = len(all_players_data) + 1
        p["isForeign"] = p["country"] != "India"
        p["role"] = "Batsman"
        all_players_data.append(p)
        seen.add(p["name"])

with open('c:/Users/Sarthak/OneDrive/Desktop/sarthak webdev/iplauctiongame/src/data/players.json', 'w') as f:
    json.dump(all_players_data, f, indent=2)

print(f"Updated players.json with {len(all_players_data)} players.")
print("All players are now in the Auction Pool (status: unsold).")
