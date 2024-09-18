function extractPlayedMatchups() {
    const matchups = [];
    const rows = document.querySelectorAll('tr.matchup');

    rows.forEach(row => {
        const confidencePoints = parseInt(row.querySelector('.conf-score') ? row.querySelector('.conf-score').innerText : null);
        if (isNaN(confidencePoints)) {
            return;
        }
        const gameId = row.querySelector('.info a').id.split('-')[2];
        const favoriteTeam = row.querySelector('.favorite a').innerText;
        const underdogTeam = row.querySelector('.underdog a').innerText;
        const status = row.querySelector('.result') ? row.querySelector('.result').innerText : null;


        matchups.push({
            gameId,
            favorite: favoriteTeam,
            underdog: underdogTeam,
            status,
            confidencePoints
        });
    });

    return matchups; // Return the matchups data structure
}

function writeMatchupsToTable(matchups) {
    const table = document.getElementById('ysf-picks-table');
    const tableHead = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    const rows = tableBody.querySelectorAll('tr.matchup');

    // Add column name to thead
    const newTh = document.createElement('th');
    newTh.textContent = 'Jason Prediction';
    tableHead.querySelector('tr').appendChild(newTh);

    rows.forEach((row, index) => {
        const favorite = row.querySelector('.favorite a').innerText;
        const matchup = matchups.find(m => m.teamName === favorite);
        if (!matchup) {
            return;
        }
        const newCell = document.createElement('td');
        newCell.textContent = matchup.confidencePoints;
        if (matchup.confidencePoints !== parseInt(row.querySelector('select')?.value)) {
            newCell.style.backgroundColor = 'yellow';
        }
        row.appendChild(newCell);
    });
}

function readOddsFile() {
    const oddsUrl = 'https://raw.githubusercontent.com/jdekarske/football_odds/gh-pages/odds.json';
    return fetch(oddsUrl) // Return the promise from fetch
        .then(response => response.json())
        .then(data => {
            return data
                .filter(matchup => matchup["Avg Spread"] < 0)
                .map(matchup => ({
                    teamName: matchup["Team Name"],
                    confidencePoints: matchup.Score
                }));
        })
        .catch(error => {
            console.error('Error reading odds file:', error);
        });
}

function selectFavorites() {
    rows = document.querySelectorAll('tr.matchup')
    rows.forEach(r => {
        r.querySelector('input').checked = true
    })
}

function main() {
    const tableBody = document.getElementById('ysf-picks-table').querySelector('tbody');
    const rows = tableBody.querySelectorAll('tr.matchup').length;
    let points = Array.from({ length: rows }, (_, i) => i + 1);
    let playedMatchups = extractPlayedMatchups();
    let playedMatchupPoints = playedMatchups.map(matchup => matchup.confidencePoints);
    points = points.filter(point => !playedMatchupPoints.includes(point));

    readOddsFile().then(data => {
        data = data.sort((a, b) => a.confidencePoints - b.confidencePoints);
        for (let i = 0; i < data.length; i++) {
            data[i].confidencePoints = points[i];
        }
        writeMatchupsToTable(data);
    });

    selectFavorites();
}

main();