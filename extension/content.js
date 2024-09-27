function extractMatchups(isPlayed) {
    const table = document.getElementById('ysf-picks-table');
    const tableBody = table.querySelector('tbody');
    const rows = tableBody.querySelectorAll('tr.matchup');
    return Array.from(rows).filter(row => isPlayed ? !row.querySelector('select') : row.querySelector('select'));
}

function extractPlayedMatchups() {
    return extractMatchups(true);
}

function extractUnplayedMatchups() {
    return extractMatchups(false);
}

function writeSuggestedScores(predictedMatchups) {
    const table = document.getElementById('ysf-picks-table');
    const tableHead = table.querySelector('thead');
    const matchupRows = extractUnplayedMatchups();

    // Add column name to thead if it doesn't exist
    if (!tableHead.querySelector('th:last-child')?.textContent.includes('Jason Prediction')) {
        const newTh = document.createElement('th');
        newTh.textContent = 'Jason Prediction';
        tableHead.querySelector('tr').appendChild(newTh);
    }

    matchupRows.forEach((row) => {
        const favorite = row.querySelector('.favorite a').innerText;
        const underdog = row.querySelector('.underdog a').innerText;

        const predictedMatchup = predictedMatchups.find(m => m.teamName === favorite || m.teamName === underdog);

        if (!predictedMatchup) {
            return;
        }

        const newCell = document.createElement('td');
        newCell.textContent = predictedMatchup.confidencePoints;
        const currentValue = parseInt(row.querySelector('select')?.value);
        newCell.style.backgroundColor = predictedMatchup.confidencePoints !== currentValue ? 'yellow' : '';
        row.appendChild(newCell);
    });
}

function writeTeamSelection(matchups) {
    const matchupRows = extractUnplayedMatchups();

    matchupRows.forEach((row) => {
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
    const matchupRows = extractUnplayedMatchups();

    matchupRows.forEach((row, index) => {
        const lastCell = row.querySelector('td:last-child');
        const points = parseInt(lastCell.textContent);
        row.querySelector('select').value = points;
    });
}

function readOddsFile() {
    const oddsUrl = 'https://raw.githubusercontent.com/jdekarske/football_odds/gh-pages/odds.json';
    return fetch(oddsUrl)
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
    const unplayedMatchups = extractUnplayedMatchups();
    const playedMatchups = extractPlayedMatchups();
    let points = Array.from({ length: unplayedMatchups.length + playedMatchups.length}, (_, i) => i + 1);
    let playedMatchupPoints = playedMatchups.map(matchup => parseInt(matchup.querySelector('td.score').textContent));
    points = points.filter(point => !playedMatchupPoints.includes(point));

    readOddsFile().then(data => {
        data = data.sort((a, b) => a.confidencePoints - b.confidencePoints);
        for (let i = 0; i < data.length; i++) {
            data[i].confidencePoints = points[i];
        }
        writeSuggestedScores(data);

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginBottom = '10px';

        const writeSelectionButton = document.createElement('button');
        writeSelectionButton.textContent = 'Write Selection';
        writeSelectionButton.onclick = () => writeTeamSelection(data);
        buttonContainer.appendChild(writeSelectionButton);

        const writePointsButton = document.createElement('button');
        writePointsButton.textContent = 'Write Points';
        writePointsButton.onclick = () => writePointsToTable(data);
        buttonContainer.appendChild(writePointsButton);

        const picksTable = document.getElementById('ysf-picks-table');
        picksTable.parentNode.insertBefore(buttonContainer, picksTable);
    });
}

main();