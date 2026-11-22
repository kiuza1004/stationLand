async function checkDeployedFiles() {
  const base = 'https://kiuza1004.github.io/stationLand/';
  const files = [
    'index.html',
    'css/style.css',
    'js/subwayData.js',
    'js/clientEngine.js',
    'js/state.js',
    'js/minigame.js',
    'js/simulator.js',
    'js/app.js',
    'manifest.json'
  ];

  for (const f of files) {
    try {
      const res = await fetch(base + f);
      console.log(`${f}: ${res.status} ${res.statusText} (${res.headers.get('content-length')} bytes)`);
    } catch (e) {
      console.error(`${f}: FETCH ERROR`, e.message);
    }
  }
}
checkDeployedFiles();
