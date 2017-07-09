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

  add(pathComponents) {
    let cur = this.root;
    const fullPath = pathComponents.join('.');
    for (const [idx, p] of Object.entries(pathComponents)) {
      const partialPath = pathComponents.slice(0, idx + 1).join('.');
      cur.subtree.push(fullPath);
      if (cur.children[p] === undefined) {
        cur.children[p] = this.makeChild(partialPath);
      }
      cur = cur.children[p];
    }
    cur.subtree.push(fullPath);
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

function walkDir(trie, dirName, appName, subDirName, baseDir) {
  for (const filename of fs.readdirSync(dirName)) {
    const fullPath = path.join(dirName, filename);
    const stat = fs.statSync(fullPath);
    const relevantPart = fullPath.slice(baseDir.length + appName.length + subDirName.length + 3);
    const pathComponents = relevantPart.split(path.sep);

    //		console.log('fullpath > ', relevant_part);

    if (stat && stat.isDirectory()) {
      trie.add(pathComponents);
      walkDir(trie, fullPath, appName, subDirName, baseDir);
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
    for (const apkname of apknames) {
      const trie = new Trie();
      const APK_EXT = '.apk';
      const isApk = apkname.includes(APK_EXT);
      const appName = apkname.slice(0, -APK_EXT.length);
      const apkPath = path.join(appsdir, apkname);
      const cmd = `java -jar ${apktoolpath} d ${apkPath} -f`;
      const unpackRoot = path.join(tmpdir, appName);

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
        for (const sdName of fs.readdirSync(unpackRoot)) {
          const fullPath = path.join(unpackRoot, sdName);
          if (sdName.includes('smali') || sdName.includes('unknown') && fs.statSync(fullPath).isDirectory()) {
            console.error('walking ', fullPath);
            walkDir(trie, fullPath, appName, sdName, tmpdir);
          }
        }
        const packages = findPackages(trie.flatten()).map((p) => p.name);
        // Send list of packages back to master
        process.send({appName, packages});
      } catch (e) {
        console.error('skipping ', appName);
      }
      try {
        // delete the app
        console.error('cleaning up ', unpackRoot);
        deleteFolderRecursive(unpackRoot);
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
    console.log(`Worker ${process.pid} ended`);
    process.exit(0);
  });
}
main();
