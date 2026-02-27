const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\Sarthak\\OneDrive\\Desktop\\sarthak webdev\\iplauctiongame\\src\\data\\players.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const updatedData = data.map(p => {
    let rating = 3; // Default
    if (p.basePrice <= 50) rating = 2;
    else if (p.basePrice <= 100) rating = 3;
    else if (p.basePrice <= 150) rating = 4;
    else rating = 5;

    return { ...p, rating };
});

fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
console.log('Successfully added manual ratings to all players!');
