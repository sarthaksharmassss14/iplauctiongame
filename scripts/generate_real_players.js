const fs = require('fs');
const path = require('path');

const players = [
    // Marquee & Top Performers
    { name: "Rishabh Pant", role: "Wicketkeeper", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380730.png", stats: { matches: 111, runs: 3284, avg: 35.31, sr: 148.93 } },
    { name: "Shreyas Iyer", role: "Batsman", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380736.png", stats: { matches: 115, runs: 3127, avg: 31.59, sr: 125.84 } },
    { name: "KL Rahul", role: "Wicketkeeper", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380728.png", stats: { matches: 132, runs: 4683, avg: 45.47, sr: 134.61 } },
    { name: "Jos Buttler", role: "Wicketkeeper", country: "England", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378600/378604.png", stats: { matches: 107, runs: 3582, avg: 41.65, sr: 147.23 } },
    { name: "Arshdeep Singh", role: "Bowler", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380749.png", stats: { matches: 65, wickets: 87, eco: 8.76, sr: 15.8 } },
    { name: "Mitchell Starc", role: "Bowler", country: "Australia", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378400/378433.png", stats: { matches: 41, wickets: 51, eco: 8.21, sr: 17.5 } },
    { name: "Kagiso Rabada", role: "Bowler", country: "South Africa", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378521.png", stats: { matches: 80, wickets: 117, eco: 8.42, sr: 15.3 } },
    { name: "Liam Livingstone", role: "All-rounder", country: "England", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378600/378609.png", stats: { matches: 39, runs: 939, wickets: 10, sr: 162.46, eco: 9.20 } },
    { name: "Yuzvendra Chahal", role: "Bowler", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380729.png", stats: { matches: 160, wickets: 205, eco: 7.84, sr: 17.2 } },
    { name: "Mohammed Shami", role: "Bowler", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380725.png", stats: { matches: 110, wickets: 127, eco: 8.44, sr: 18.2 } },
    { name: "Ishan Kishan", role: "Wicketkeeper", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380732.png", stats: { matches: 105, runs: 2644, avg: 28.43, sr: 135.87 } },
    { name: "Trent Boult", role: "Bowler", country: "New Zealand", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378700/378721.png", stats: { matches: 104, wickets: 121, eco: 8.29, sr: 19.3 } },
    { name: "David Miller", role: "Batsman", country: "South Africa", basePrice: 150, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378522.png", stats: { matches: 130, runs: 2924, avg: 34.81, sr: 139.24 } },
    { name: "Quinton de Kock", role: "Wicketkeeper", country: "South Africa", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378520.png", stats: { matches: 107, runs: 3157, avg: 31.26, sr: 134.23 } },
    { name: "Venkatesh Iyer", role: "All-rounder", country: "India", basePrice: 150, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380746.png", stats: { matches: 50, runs: 1326, avg: 31.57, sr: 137.12 } },
    { name: "Bhuvneshwar Kumar", role: "Bowler", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380737.png", stats: { matches: 176, wickets: 181, eco: 7.56, sr: 21.3 } },
    { name: "Harry Brook", role: "Batsman", country: "England", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378600/378614.png", stats: { matches: 11, runs: 190, avg: 21.11, sr: 123.38 } },
    { name: "Devon Conway", role: "Batsman", country: "New Zealand", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378700/378726.png", stats: { matches: 23, runs: 924, avg: 48.63, sr: 141.28 } },
    { name: "Wanindu Hasaranga", role: "Bowler", country: "Sri Lanka", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378700/378724.png", stats: { matches: 30, wickets: 37, eco: 8.13, sr: 16.5 } },
    { name: "David Warner", role: "Batsman", country: "Australia", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378400/378430.png", stats: { matches: 184, runs: 6565, avg: 40.52, sr: 139.77 } },
    { name: "Glenn Maxwell", role: "All-rounder", country: "Australia", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378400/378434.png", stats: { matches: 134, runs: 2771, wickets: 37, sr: 156.73, eco: 8.39 } },
    { name: "Faf du Plessis", role: "Batsman", country: "South Africa", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378519.png", stats: { matches: 145, runs: 4571, avg: 35.71, sr: 136.32 } },
    { name: "Mohammed Siraj", role: "Bowler", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380733.png", stats: { matches: 93, wickets: 93, eco: 8.65, sr: 21.2 } },
    { name: "Ravichandran Ashwin", role: "Bowler", country: "India", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/380700/380723.png", stats: { matches: 212, wickets: 180, eco: 7.12, sr: 24.5 } },
    { name: "Pat Cummins", role: "Bowler", country: "Australia", basePrice: 200, image: "https://p.imgci.com/db/PICTURES/CMS/378400/378431.png", stats: { matches: 58, wickets: 63, eco: 8.54, sr: 19.8 } },
    { name: "Rachin Ravindra", role: "All-rounder", country: "New Zealand", basePrice: 150, image: "https://p.imgci.com/db/PICTURES/CMS/378700/378716.png", stats: { matches: 10, runs: 222, sr: 160.87, avg: 22.2 } },
    { name: "Marco Jansen", role: "Bowler", country: "South Africa", basePrice: 125, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378518.png", stats: { matches: 20, wickets: 25, eco: 8.90, sr: 16.8 } },
    { name: "Gerald Coetzee", role: "Bowler", country: "South Africa", basePrice: 125, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378517.png", stats: { matches: 10, wickets: 13, eco: 10.1, sr: 14.5 } },
    { name: "Spencer Johnson", role: "Bowler", country: "Australia", basePrice: 100, image: "https://p.imgci.com/db/PICTURES/CMS/378400/378415.png", stats: { matches: 5, wickets: 4, eco: 9.3, sr: 22.0 } },
    { name: "Dilshan Madushanka", role: "Bowler", country: "Sri Lanka", basePrice: 100, image: "https://p.imgci.com/db/PICTURES/CMS/378700/378712.png", stats: { matches: 8, wickets: 10, eco: 8.5, sr: 18.0 } },
    { name: "Nandre Burger", role: "Bowler", country: "South Africa", basePrice: 75, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378512.png", stats: { matches: 6, wickets: 7, eco: 9.2, sr: 18.5 } },
    { name: "Azmatullah Omarzai", role: "All-rounder", country: "Afghanistan", basePrice: 50, image: "https://p.imgci.com/db/PICTURES/CMS/378500/378510.png", stats: { matches: 7, runs: 120, wickets: 4, sr: 135.5, eco: 8.8 } },
    { name: "Nuwan Thushara", role: "Bowler", country: "Sri Lanka", basePrice: 50, image: "https://p.imgci.com/db/PICTURES/CMS/378700/378705.png", stats: { matches: 7, wickets: 8, eco: 8.9, sr: 17.5 } },
    { name: "Jhye Richardson", role: "Bowler", country: "Australia", basePrice: 150, image: "https://p.imgci.com/db/PICTURES/CMS/378400/378408.png", stats: { matches: 15, wickets: 19, eco: 8.5, sr: 16.5 } },
];

const indianNames = [
    "Prithvi Shaw", "Mayank Agarwal", "Karun Nair", "Ajinkya Rahane", "Manish Pandey", 
    "Sarfaraz Khan", "Shahrukh Khan", "Rahul Tripathi", "Abhishek Sharma", "Tilak Varma",
    "Rinku Singh", "Jitesh Sharma", "Sanju Samson", "Dhruv Jurel", "Dinesh Karthik",
    "Washington Sundar", "Krunal Pandya", "Deepak Hooda", "Shivam Dube", "Riyan Parag",
    "Deepak Chahar", "Shardul Thakur", "Harshal Patel", "Avesh Khan", "Arshdeep Singh",
    "Umesh Yadav", "T Natarajan", "Rahul Chahar", "Kuldeep Yadav", "Ravi Bishnoi",
    "Varun Chakaravarthy", "Chetan Sakariya", "Khaleel Ahmed", "Sandeep Sharma", "Mohit Sharma",
    "Navdeep Saini", "Prasidh Krishna", "Shivam Mavi", "Kamlesh Nagarkoti", "Kartik Tyagi",
    "Deepak Jaglan", "Nitish Reddy", "Abhishek Porel", "Anuj Rawat", "Prabhsimran Singh",
    "Shahbaz Ahmed", "Lalit Yadav", "Rahul Tewatia", "Vijay Shankar", "Harpreet Brar",
    "Mayank Yadav", "Tushar Deshpande", "Akash Deep", "Mukesh Kumar", "Yash Dayal"
];

const overseasNames = [
    "Pat Cummins", "Mitchell Starc", "Glenn Maxwell", "Travis Head", "Mitchell Marsh",
    "Rashid Khan", "Noor Ahmad", "Fazalhaq Farooqi", "Rahmanullah Gurbaz",
    "Jos Buttler", "Liam Livingstone", "Sam Curran", "Harry Brook", "Phil Salt",
    "Nicholas Pooran", "Andre Russell", "Sunil Narine", "Shimron Hetmyer", "Rovman Powell",
    "Quinton de Kock", "Kagiso Rabada", "David Miller", "Heinrich Klaasen", "Aiden Markram",
    "Trent Boult", "Devon Conway", "Rachin Ravindra", "Daryl Mitchell", "Glenn Phillips",
    "Wanindu Hasaranga", "Matheesha Pathirana", "Maheesh Theekshana", "Kusal Mendis"
];

const rolesPool = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];

// Add more real Indian players
indianNames.forEach(name => {
    if (!players.find(p => p.name === name)) {
        players.push({
            name,
            role: rolesPool[Math.floor(Math.random() * rolesPool.length)],
            country: "India",
            basePrice: [30, 50, 75, 100][Math.floor(Math.random() * 4)],
            stats: { matches: Math.floor(Math.random() * 80) + 20, sr: Math.floor(Math.random() * 40) + 130 }
        });
    }
});

// Add more overseas players
overseasNames.forEach(name => {
    if (!players.find(p => p.name === name)) {
        players.push({
            name,
            role: rolesPool[Math.floor(Math.random() * rolesPool.length)],
            country: "Overseas",
            basePrice: [100, 150, 200][Math.floor(Math.random() * 3)],
            stats: { matches: Math.floor(Math.random() * 60) + 15, sr: Math.floor(Math.random() * 50) + 140 }
        });
    }
});

const finalPlayers = players.map((p, i) => ({
    id: i + 1,
    ...p,
    isForeign: p.country !== "India",
    status: "unsold",
    soldPrice: 0,
    teamId: null
}));

const outputPath = path.join(__dirname, '..', 'src', 'data', 'players.json');
fs.writeFileSync(outputPath, JSON.stringify(finalPlayers, null, 2));
console.log(`Generated ${finalPlayers.length} professional players at ${outputPath}`);
