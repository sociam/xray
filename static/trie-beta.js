const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

const level = require('level');

function chunkArray(arr, chunkCount) {
  const chunks = [];
  while (arr.length) {
    const chunkSize = Math.ceil(arr.length / chunkCount--);
    const chunk = arr.slice(0, chunkSize);
    chunks.push(chunk);
    arr = arr.slice(chunkSize);
  }
  return chunks;
}

// now let's try doing some magic

function main() {
  console.error(`Master ${process.pid} is running`);
  cluster.setupMaster({
    exec: 'trie-worker.js',
    silent: false
  });

  const {
    apktoolpath,
    tmpdir,
    appsdir,
    dbdir
  } = JSON.parse(fs.readFileSync('./config.json'));

  // check that the tmpdir is writable
  const testFile = Math.random().toString().replace('.', '') + '.tmp';
  const testFilePath = path.join(tmpdir, testFile);
  try {
    fs.closeSync(fs.openSync(testFilePath, 'w'));
  } catch (e) {
    console.error('could not write to temp directory');
    return false;
  } finally {
    try {
      fs.unlinkSync(testFilePath);
    } catch (e) {}
  }

  // open DB connection
  const db = level(dbdir, {valueEncoding: 'json'});

  // fork workers
  const numCPUs = os.cpus().length;
  const apkNames = fs.readdirSync(appsdir);
  const numApks = apkNames.length;
  const numWorkers = Math.min(numCPUs, numApks);
  const apkgroups = chunkArray(apkNames, numWorkers);

  const byApp = {};
  const addAppInfo = ({appName, packages}) => {
    byApp[appName] = packages;
    db.put(appName, packages);
    // Print final analysis results when all apps are processed
    if (Object.keys(byApp).length === numApks) {
      console.log(JSON.stringify(byApp, null, 4));
    }
  };

  console.log(`Distributing ${apkNames.length} apps to ${numWorkers} workers`);
  for (let i = 0; i < numWorkers; i++) {
    const config = {
      apknames: apkgroups[i],
      apktoolpath,
      tmpdir,
      appsdir
    };
    const worker = cluster.fork();
    worker.send(config);
    worker.on('message', addAppInfo);
  }

}
main();
