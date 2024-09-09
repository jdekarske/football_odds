document.getElementById('readValues').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.executeScript(tabs[0].id, { file: 'content.js' }, (results) => {
            document.getElementById('output').textContent = JSON.stringify(results[0], null, 2);
        });
    });
});
