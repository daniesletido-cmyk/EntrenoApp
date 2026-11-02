const { execSync } = require('child_process');
const path = require('path');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = path.resolve('test_shot.png');
execSync(`"${chrome}" --headless --disable-gpu --screenshot="${out}" --window-size=800,600 "about:blank"`);
console.log('Exists:', require('fs').existsSync(out));
