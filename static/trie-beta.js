const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

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
    appsdir
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

  // fork workers
  const numCPUs = os.cpus().length;
  const apknames = fs.readdirSync(appsdir);
  const numWorkers = Math.min(numCPUs, apknames.length);
  const apkgroups = chunkArray(apknames, numWorkers);
  console.log(`Distributing ${apknames.length} apps to ${numWorkers} workers`);
  for (let i = 0; i < numWorkers; i++) {
    const config = {
      apknames: apkgroups[i],
      apktoolpath,
      tmpdir,
      appsdir
    };
    const worker = cluster.fork();
    worker.send(config);
  }
  const byApp = {};
  let finishedWorkers = 0;
  const messageHandler = ({
    pid,
    results
  }) => {
    console.log(`Received results from worker ${pid}`);
    Object.assign(byApp, results);
    finishedWorkers++;
    if (finishedWorkers == numWorkers) {
      console.log(JSON.stringify(byApp, null, 4));
      process.exit(0);
    }
  };
  for (const id in cluster.workers) {
    cluster.workers[id].on('message', messageHandler);
  }
}
main();
