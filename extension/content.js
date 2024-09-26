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

function writeTeamSelection(matchups) {
    const table = document.getElementById('ysf-picks-table');
    const tableBody = table.querySelector('tbody');
    const rows = tableBody.querySelectorAll('tr.matchup');
    const rowsWithSelect = Array.from(rows).filter(row => row.querySelector('select'));

    rowsWithSelect.forEach((row) => {
        const favorite = row.querySelector('.favorite a').innerText;
        const underdog = row.querySelector('.underdog a').innerText;
        let matchup = matchups.find(m => m.teamName === favorite);
        if (!matchup) {
            matchup = matchups.find(m => m.teamName === underdog);
            if (!matchup) {
                console.error("team missing:", matchup);
                return;
            }
            row.querySelector('.underdog-win input').checked = true;
        } else {
            row.querySelector('.favorite-win input').checked = true;
        }
    });
}

function writePointsToTable() {
    const table = document.getElementById('ysf-picks-table');
    const tableBody = table.querySelector('tbody');
    const rows = tableBody.querySelectorAll('tr.matchup');
    const rowsWithSelect = Array.from(rows).filter(row => row.querySelector('select'));

    rowsWithSelect.forEach((row, index) => {
        const lastCell = row.querySelector('td:last-child');
        const points = parseInt(lastCell.textContent);
        row.querySelector('select').value = points;
    });
}

function writeMatchupsToTable(matchups) {
    const table = document.getElementById('ysf-picks-table');
    const tableHead = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    const rows = tableBody.querySelectorAll('tr.matchup');
    const rowsWithSelect = Array.from(rows).filter(row => row.querySelector('select'));

    // Add column name to thead if it doesn't exist
    if (!tableHead.querySelector('th:last-child')?.textContent.includes('Jason Prediction')) {
        const newTh = document.createElement('th');
        newTh.textContent = 'Jason Prediction';
        tableHead.querySelector('tr').appendChild(newTh);
    }

    rowsWithSelect.forEach((row, index) => {
        const favorite = row.querySelector('.favorite a').innerText;
        const underdog = row.querySelector('.underdog a').innerText;

        const matchup = matchups.find(m => m.teamName === favorite || m.teamName === underdog);

        if (!matchup) {
            return;
        }
        const points = matchup.confidencePoints;
        const newCell = document.createElement('td');
        row.appendChild(newCell);
        newCell.textContent = points;
        const currentValue = parseInt(row.querySelector('select')?.value);
        newCell.style.backgroundColor = points !== currentValue ? 'yellow' : '';
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

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginBottom = '10px';

        const writePointsButton = document.createElement('button');
        writePointsButton.textContent = 'Write Points';
        writePointsButton.onclick = () => writePointsToTable(data);
        buttonContainer.appendChild(writePointsButton);

        const writeSelectionButton = document.createElement('button');
        writeSelectionButton.textContent = 'Write Selection';
        writeSelectionButton.onclick = () => writeTeamSelection(data);
        buttonContainer.appendChild(writeSelectionButton);

        const picksTable = document.getElementById('ysf-picks-table');
        picksTable.parentNode.insertBefore(buttonContainer, picksTable);
    });
}

main();