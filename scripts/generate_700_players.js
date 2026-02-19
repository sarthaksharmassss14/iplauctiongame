const fs = require('fs');
const path = require('path');

const firstNames = [
    "Virat", "Rohit", "MS", "Hardik", "Jasprit", "Suryakumar", "Rishabh", "KL", "Shubman", "Shreyas",
    "Yashasvi", "Ruturaj", "Sanju", "Ishan", "Axar", "Ravindra", "Kuldeep", "Yuzvendra", "Mohammed", "Arshdeep",
    "Avesh", "Harshal", "Deepak", "Shardul", "Washington", "Rinku", "Tilak", "Umran", "Prithvi", "Abhishek",
    "David", "Steve", "Glenn", "Mitchell", "Pat", "Travis", "Kane", "Jos", "Ben", "Sam",
    "Liam", "Rashid", "Quinton", "Kagiso", "Anrich", "Nicholas", "Andre", "Sunil", "Trent", "Devon"
];

const lastNames = [
    "Kohli", "Sharma", "Dhoni", "Pandya", "Bumrah", "Yadav", "Pant", "Rahul", "Gill", "Iyer",
    "Jaiswal", "Gaikwad", "Samson", "Kishan", "Patel", "Jadeja", "Sundar", "Chahal", "Shami", "Singh",
    "Khan", "Warner", "Smith", "Maxwell", "Starc", "Cummins", "Head", "Williamson", "Buttler", "Stokes",
    "Curran", "Livingstone", "Rashid", "de Kock", "Rabada", "Nortje", "Pooran", "Russell", "Narine", "Boult",
    "Conway", "Siraj", "Thakur", "Chahar", "Varma", "Malik", "Shaw", "Padikkal", "Sudharsan", "Dube"
];

const roles = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];
const countries = ["India", "Australia", "England", "South Africa", "West Indies", "New Zealand", "Afghanistan", "Sri Lanka"];
const basePrices = [20, 30, 40, 50, 75, 100, 150, 200];

const topStars = [
    { name: "Virat Kohli", role: "Batsman", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/381600/381650.3.png", stats: { matches: 252, runs: 8004, avg: 61.1, sr: 154.2 } },
    { name: "MS Dhoni", role: "Wicketkeeper", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380727.png", stats: { matches: 264, runs: 5243, avg: 39.1, sr: 137.5 } },
    { name: "Jasprit Bumrah", role: "Bowler", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380735.png", stats: { matches: 133, wickets: 165, eco: 7.3, sr: 18.7 } },
    { name: "Rohit Sharma", role: "Batsman", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380724.png", stats: { matches: 257, runs: 6628, avg: 29.7, sr: 131.1 } },
    { name: "Hardik Pandya", role: "All-rounder", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380731.png", stats: { matches: 137, runs: 2525, wickets: 64, sr: 145.8, eco: 8.8 } },
    { name: "Suryakumar Yadav", role: "Batsman", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380734.png", stats: { matches: 150, runs: 3594, avg: 48.0, sr: 182.5 } },
    { name: "Will Jacks", role: "All-rounder", country: "England", basePrice: 150, image: "https://p.imgci.com/db/PICTURES/CMS/378600/378600.png", stats: { matches: 5, runs: 440, avg: 110.0, sr: 175.5 } },
    { name: "Rashid Khan", role: "Bowler", country: "Afghanistan", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378523.png", stats: { matches: 121, wickets: 149, eco: 6.8, sr: 19.3 } },
    { name: "Mitchell Starc", role: "Bowler", country: "Australia", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378400/378433.png", stats: { matches: 41, wickets: 51, eco: 8.2, sr: 17.5 } },
    { name: "Sunil Narine", role: "All-rounder", country: "West Indies", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378800/378824.png", stats: { matches: 177, runs: 1534, wickets: 180, sr: 147.2, eco: 6.7 } }
];

const players = [];

// Add top stars first
topStars.forEach((star, index) => {
    players.push({
        id: index + 1,
        ...star,
        isForeign: star.country !== "India",
        status: "unsold",
        soldPrice: 0,
        teamId: null
    });
});

// Generate remaining players until 700
for (let i = players.length; i < 700; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const country = Math.random() < 0.7 ? "India" : countries[Math.floor(Math.random() * countries.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    
    // Weighted base price
    let basePrice;
    const rand = Math.random();
    if (rand < 0.05) basePrice = 200;
    else if (rand < 0.15) basePrice = 150;
    else if (rand < 0.35) basePrice = 100;
    else if (rand < 0.60) basePrice = 50;
    else basePrice = 20;

    const stats = {
        matches: Math.floor(Math.random() * 100) + 10,
        sr: Math.floor(Math.random() * 60) + 120
    };

    if (role === "Batsman" || role === "All-rounder" || role === "Wicketkeeper") {
        stats.runs = Math.floor(Math.random() * 3000) + 200;
        stats.avg = Math.floor(Math.random() * 25) + 20;
    }
    if (role === "Bowler" || role === "All-rounder") {
        stats.wickets = Math.floor(Math.random() * 100) + 5;
        stats.eco = (Math.random() * 4 + 6).toFixed(2);
    }

    players.push({
        id: i + 1,
        name: `${fName} ${lName} ${i+1}`, // Unique tag for non-stars
        role,
        country,
        basePrice,
        isForeign: country !== "India",
        status: "unsold",
        soldPrice: 0,
        teamId: null,
        stats
    });
}

const outputPath = path.join(__dirname, '..', 'src', 'data', 'players.json');
fs.writeFileSync(outputPath, JSON.stringify(players, null, 2));
console.log(`Successfully generated ${players.length} players at ${outputPath}`);
