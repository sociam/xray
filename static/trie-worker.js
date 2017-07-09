const fs = require('fs');
const path = require('path');
const spawn = require('child_process');

function deleteFolderRecursive(dir) {
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const curPath = path.join(dir, file);
      if (fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    }
    fs.rmdirSync(dir);
  }
}

class Trie {
  constructor() {
    this.root = this.makeChild();
  }

  makeChild(name = '', children = {}, subtree = []) {
    return {
      name,
      children,
      subtree
    };
  }

  reset() {
    this.root = this.makeChild();
  }

  add(path) {
    let cur = this.root;
    for (const [idx, p] of Object.entries(path)) {
      const partialPath = path.slice(0, idx + 1).join('.');
      cur.subtree.push(path.join('.'));
      if (cur.children[p] === undefined) {
        cur.children[p] = this.makeChild(partialPath);
      }
      cur = cur.children[p];
    }
    cur.subtree.push(path.join('.'));
  }

  flatten(node = this.root) {
    let nodes = [node];
    for (const child of Object.values(node.children)) {
      nodes = [...nodes, ...this.flatten(child)];
    }
    return nodes;
  }
}

function findPackages(ft) {
  // takes flattened tree in
  const MIN_LENGTH = 2;
  let soFar = [];

  for (const x of ft) {
    if (x.name.split('.').length > MIN_LENGTH && Object.values(x.children).length > 1) {
      // replace longer matches with this shorter one

      // get rid of all that are longer
      soFar = soFar.filter(sfm => !sfm.includes(x.name));

      // console.log('checking dupe ', so_far, x.name,
      // 	'unique ? ',
      // 	so_far.filter((sf) => x.name.indexOf(sf) >= 0),
      // 	so_far.filter((sf) => x.name.indexOf(sf) >= 0).length === 0
      // );

      // only add us if we are the shortest
      if (soFar.filter(sf => x.name.includes(sf)).length === 0) {
        soFar.push(x.name);
      }
    }
  }
  const trees = soFar.map((n) => ft.filter((x) => x.name === n)[0]);
  // console.log('!~ names ', so_far, ' trees ', trees);
  return trees;
}

function walkDir(trie, dirname, appname, subdirname, basedir) {
  for (const filename of fs.readdirSync(dirname)) {
    const fullpath = path.join(dirname, filename);
    const stat = fs.statSync(fullpath);
    const relevantPart = fullpath.slice(basedir.length + appname.length + subdirname.length + 3);
    const pathsplits = relevantPart.split('/');

    //		console.log('fullpath > ', relevant_part);

    if (stat && stat.isDirectory()) {
      trie.add(pathsplits);
      walkDir(trie, fullpath, appname, subdirname, basedir);
    }
  }
}

function main() {
  console.log(`Worker ${process.pid} started`);
  process.on('message', ({
    apknames,
    apktoolpath,
    tmpdir,
    appsdir
  }) => {
    console.log(`Worker ${process.pid} starting to process ${apknames.length} apps`);
    let byApp = {};
    for (const apkname of apknames) {
      const trie = new Trie();
      const APK_EXT = '.apk';
      const isApk = apkname.includes(APK_EXT);
      const appname = apkname.slice(0, -APK_EXT.length);
      const apkpath = path.join(appsdir, apkname);
      const cmd = `java -jar ${apktoolpath} d ${apkpath} -f`;
      const unpackroot = path.join(tmpdir, appname);

      if (!isApk) {
        console.error('skipping ', apkname);
        continue;
      }
      // console.error('executing ', cmd);
      try {
        spawn.execSync(cmd, {
          cwd: tmpdir
        });
        // console.log('walking ', unpackdirname);
        for (const sdname of fs.readdirSync(unpackroot)) {
          const fullpath = path.join(unpackroot, sdname);
          if (sdname.includes('smali') || sdname.includes('unknown') && fs.statSync(fullpath).isDirectory()) {
            console.error('walking ', fullpath);
            walkDir(trie, fullpath, appname, sdname, tmpdir);
          }
        }
        byApp[appname] = findPackages(trie.flatten()).map((p) => p.name);
      } catch (e) {
        console.error('skipping ', appname);
      }
      try {
        // delete the app
        console.error('cleaning up ', unpackroot);
        deleteFolderRecursive(unpackroot);
      } catch (e) {
        console.error('error cleaning up ', e);
      }
    }
    // console.log(' ----------------------> full trie -------> ');
    // console.log(JSON.stringify(trie_root, null, 4));

    // console.log(' ----------------------> flat trie -------> ');
    // console.log(flattened_trie(trie_root));

    // console.log(' ----------------------> find packages -------> ');
    // console.log(find_packages(flattened_trie(trie_root)));

    // Send analysis results back to master
    process.send({pid: process.pid, results: byApp});
    console.log(`Worker ${process.pid} ended`);
    return true;

  });
}
main();
