const fs = require('fs');
const path = require('path');

const firstNames = ["Virat", "Rohit", "MS", "Shubman", "Rishabh", "Hardik", "Jasprit", "Ravindra", "KL", "Shreyas", "Suryakumar", "Ishan", "Yuzvendra", "Mohammed", "Kuldeep", "Sanju", "Deepak", "Shardul", "Axar", "Prithvi", "Abhishek", "Rinku", "Tilak", "Yashasvi", "Arshdeep", "Umran", "Avesh", "Harshal", "Washington", "Devdutt"];
const lastNames = ["Kohli", "Sharma", "Dhoni", "Gill", "Pant", "Pandya", "Bumrah", "Jadeja", "Rahul", "Iyer", "Yadav", "Kishan", "Chahal", "Shami", "Siraj", "Samson", "Chahar", "Thakur", "Patel", "Shaw", "Sharma", "Singh", "Varma", "Jaiswal", "Singh", "Malik", "Khan", "Patel", "Sundar", "Padikkal"];

const foreignFirstNames = ["David", "Ben", "Jos", "Steve", "Kane", "Pat", "Mitchell", "Glenn", "Quinton", "Kagiso", "Rashid", "Trent", "Nicholas", "Andre", "Shimron", "Faf", "Sam", "Liam", "Cameron", "Marcus"];
const foreignLastNames = ["Warner", "Stokes", "Buttler", "Smith", "Williamson", "Cummins", "Starc", "Maxwell", "de Kock", "Rabada", "Khan", "Boult", "Pooran", "Russell", "Hetmyer", "du Plessis", "Curran", "Livingstone", "Green", "Stoinis"];

const roles = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];
const countries = ["Australia", "England", "South Africa", "West Indies", "New Zealand", "Afghanistan", "Sri Lanka"];

function generatePlayers() {
    const players = [];
    
    // Generate 580 Indian players
    for (let i = 0; i < 580; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        players.push({
            id: i + 1,
            name: `${firstName} ${lastName} ${i < 20 ? "" : i}`,
            role: roles[Math.floor(Math.random() * roles.length)],
            country: "India",
            basePrice: Math.floor(Math.random() * 5 + 1) * 20, // 20, 40, 60, 80, 100 Lakhs
            isForeign: false,
            status: "unsold",
            soldPrice: 0,
            teamId: null
        });
    }

    // Generate 120 Foreign players
    for (let i = 0; i < 120; i++) {
        const firstName = foreignFirstNames[Math.floor(Math.random() * foreignFirstNames.length)];
        const lastName = foreignLastNames[Math.floor(Math.random() * foreignLastNames.length)];
        players.push({
            id: 580 + i + 1,
            name: `${firstName} ${lastName} ${i < 20 ? "" : i + 580}`,
            role: roles[Math.floor(Math.random() * roles.length)],
            country: countries[Math.floor(Math.random() * countries.length)],
            basePrice: Math.floor(Math.random() * 5 + 3) * 20, // 60, 80, 100, 120, 140 Lakhs
            isForeign: true,
            status: "unsold",
            soldPrice: 0,
            teamId: null
        });
    }

    const dataDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(dataDir, 'players.json'), JSON.stringify(players, null, 2));
    console.log("Successfully generated 700 players!");
}

generatePlayers();
