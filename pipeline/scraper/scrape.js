'use strict';
/*
Scraper script searching store for apps and archiving app data said apps.

NOTE: 120 is max number of apps to receive at once through list method...
NOTE: this has a permission section could inspect when throw this into folder
NOTE: cronjob...

TODO: to avoid the situation of askign for a captcha use a throttle keyword
, all methods now support a throttle property, which defines an upper bound to
the amount of requests that will be attempted per second. Once that limit is reached,
further requests will be held  until the second passes.
*/
const config = require('/etc/xray/config.json'); //See example_config.json
const gplay = require('google-play-scraper');
//Reading from folder of csv files
const fs = require('fs');
const fsEx = require('fs-extra');
const path = require('path');
const fs_promise = require('fs-readdir-promise');
const readline = require('readline');

//Unix pipeline setup
const unix = require('unix-dgram');
const client = unix.createSocket('unix_dgram');

const logger = require('./logger.js');

let appsSaveDir = path.join(config.datadir, 'apps');

function processErr(msg, func) {
    return function(err) {
        func(msg, err);
        return Promise.reject();
    };
}

function mkdirp(dir) {
    dir.split(path.sep).reduce((parentDir, childDir) => {
        const curDir = path.join(parentDir, childDir);
        if (!fs.existsSync(curDir)) {
            fs.mkdirSync(curDir);
        }
        return curDir;
    }, path.isAbsolute(dir) ? path.sep : '');
}


try {
    let dirStats = fs.statSync(appsSaveDir);
    if (!dirStats.isDirectory()) {
        logger.err('The app directory %s exists but is not a directory!', appsSaveDir);
        process.exit(1);
    }
} catch (err) {
    if (err.code == 'ENOENT') {
        logger.info('Creating apps folder ' + appsSaveDir);
        mkdirp(appsSaveDir);
    } else {
        logger.err('Unknown error opening appsSaveDir:', err.message);
        process.exit(1);
    }
}

let waitForPipe = () => {
    if (!fs.existsSync(config.sockpath)) {
        logger.err('Could not bind to socket... trying again in 1000s');
        setTimeout(waitForPipe, 1000);
    } else {
        main();
    }
};

waitForPipe();


//TODO: move region to config or section to iterate over
let region = 'us';
let appStore = 'play';

function resolveAPKDir(appData) {
    //console.log('appdir:'+ config.datadir, '\nappId'+ appData.appId, '\nappStore'+ appStore, '\nregion'+ region, '\nversion'+ appData.version);

    //log('appdir:'+ config.appdir, '\nappId'+ appData.appId, '\nappStore'+ appStore, '\nregion'+ region, '\nversion'+ appData.version);
    //NOTE: If app version is undefined setting to  date
    if (!appData.version || appData.version === 'Varies with device') {
        logger.debug('Version not found defaulting too', appData.updated);
        let formatDate = appData.updated.replace(/\s+/g, '').replace(',', '/');
        appData.version = formatDate;
    }

    let appSavePath = path.join(appsSaveDir, appData.appId, appStore, region, appData.version);
    logger.info('App desired save dir ' + appSavePath);

    return Promise.all([fsEx.pathExists(appSavePath), Promise.resolve(appSavePath)]);
}

function downloadApp(appData, appSavePath) {
    const args = ['-pd', appData.appId, '-f', appSavePath, '-c', config.credDownload]; /* Command line args for gplay cli */
    const spw = require('child-process-promise').spawn;
    logger.info('Passing args to downloader' + args);
    const apkDownloader = spw('gplaycli', args);

    let downloadProcess = apkDownloader.childProcess;

    mkdirp(appSavePath);
    logger.info('DL process %d for %s-%s started.', downloadProcess.pid, appData.appId, appData.version);

    downloadProcess.stdout.on('data', data => {
        logger.debug('DL process %d stdout:', downloadProcess.pid, data.toString());
    });

    downloadProcess.stderr.on('data', data => {
        logger.warning('DL process %d stderr:', downloadProcess.pid, data.toString());
    });

    return apkDownloader.catch(processErr('Error downloading app:', logger.err));
}


//TODO: check dir setup before attempting to search on that word

function extractAppData(appData) {
    //Check appData state
    if (!appData.appId) { return Promise.reject('Invalid appdata', appData.appId); }

    return resolveAPKDir(appData).then(appPathInfo => {
        let exists = appPathInfo[0],
            appSavePath = appPathInfo[1];

        if (exists) {
            logger.info('App version %s-%s already exists', appData.appId, appData.version);
            return Promise.reject();
        } else {
            logger.info('New app version %s-%s', appData.appId, appData.version);

            //TODO: append previous and write seperately
            appData.isDownloaded = true;
            return downloadApp(appData, appSavePath).catch((err) => {
                try {
                    fs.rmdir(appSavePath);
                } catch (err) {
                    logger.debug('Could not remove app saved path', err);
                }
                logger.warning('Downloading failed with error:', err.message);
                appData.isDownloaded = false;
                return Promise.resolve();
            });
        }
    }).then(() => {
        logger.info('Download process complete for ' + appData.appId);
        let db = require('./db');

        return db.insertPlayApp(appData, region).catch(processErr('Could not write to db:', logger.err));
    }).then(async (dbId) => {
        // TODO: Check that '-' won't mess things up on the DB side... eg if region was something like 'en-gb'
        let message = Buffer(dbId + '-' + appData.appId + '-' + appStore + '-' + region + '-' + appData.version);

        //client.on('error', logger.err);
        return client.send(message, 0, message.length, config.sockpath).catch(processErr('Could not connect to socket:', logger.err));
    }, () => {
        return Promise.reject();
    });
}

//Base scrapes array apps based on google-play-scraper app json format - PROMISE FORMAT
// function scrape(appsData) {
//     return appsData.map((val) => {
//         return gplay.app({ appId: val.appId }).then(function(some_other_val) {
//             return extractAppData(val).then(() => {
//                 logger('finished downloading', val.appId);
//                 return val; // whatever you return here will get passed on to the next val in the promise chain..
//             }).catch((e) => {
//                 logger.err('error downloading ', val.appId, e.toString());
//                 throw e;
//             });
//         }).catch(function(err) {
//             logger.err('Could not save app ', err);
//             return Promise.reject(appData.appId);
//         });
//     });
// }


/* Get an array of gplay Search results */
function scrapeWord(word) {
    return gplay.search({
        term: word,
        num: 4,
        region: region,
        price: 'free',
        fullDetail: true,
        throttle: 0.01,
    });
}

function reader(filepath) {
    return readline.createInterface({
        input: fs.createReadStream(filepath)
    });
}


// //Do processing syncrounously do prevent gplay having a moan
// function processAppData(appsData, processFn) {
//     let index = 0;

//     function next() {
//         if (index < appsData.length) {
//             logger.logger('Processing ', index);
//             processFn(appsData[index++])
//                 .then(next)
//                 .catch((err) => { logger.warning('downloading app failure:', err) });
//         }
//     }
//     next();
// }

function wipe_scraped_word() {
    fs.writeFile(config.datadir + '/scraped_words.txt', '', function(err) {
        if (err) {
            logger.err('Unable wipe the scraped word file');
        }
    });
}

function write_latest_word(word) {
    fs.appendFile(config.datadir + '/scraped_words.txt', word + '\n', function(err) {
        if (err) {
            logger.err('Unable to log to the scraped word file' + err.message);
        }
    });
}

// function topApps() {
//     gplay.category.forEach( cat => {
//         gplay.collection.forEach( coll => {
//             //TODO: this might all happen at once... review owrdStashFiles
//             //finish below off then scrape data + download
//             gplay.list({
//                 collection
//                 category
//                 num: 12,
//                 region: region,
//                 fullDetail: true,
//                 throttle: 0.01
//             }).then( app => {

//                 //TODO: later before begin scraping you do a similar search here

//                 return extractAppData(app);
//             }).catch( err => {
//                 log('Err with word stash',err.message);
//             });

//         });
//     });
// }

function main() {
    wipe_scraped_word();

    let wordStash = config.wordStashDir;
    let wordStashFiles = fs_promise(wordStash);

    // TODO: Refactor this....
    wordStashFiles.then(files => {
        let q = Promise.resolve();

        files.map(file => {
            q = q.then(() => {
                return new Promise((resolve) => {
                    logger.info('Resolving word stash' + wordStash);
                    let filepath = require('path').join(wordStash, file);

                    let rd = reader(filepath);

                    let p = Promise.resolve();

                    rd.on('line', (word) => {
                        p = p.then(() => {
                            logger.info('searching on word:', word);
                            write_latest_word(word);
                            return scrapeWord(word).catch((err) => {
                                logger.err('scraping app on word failed:' + err);
                                return Promise.reject();
                            });
                        }).then(function(appsData) {
                            logger.debug('Search apps total:', appsData.length);
                            let r = Promise.resolve();

                            appsData.forEach(app => {
                                r = r.then(() => {
                                    logger.info('Attempting to download:' + app.appId);
                                    return extractAppData(app);
                                }, (err) => logger.warning('Downloading app failed:' + err.message));
                            });
                            //processAppData(appsData,extractAppData);

                        }, processErr('Could not connect to socket:', logger.err));
                    });

                    rd.on('end', () => {
                        p.then(() => resolve());
                        p.catch((err) => logger.err('last data word failed:' + err));
                    });
                });
            }, processErr('could no iterate through words in file:', logger.debug));
        }, processErr('could no iterate through words in file:', logger.debug));
    }).catch(function(err) {
        logger.err('Err with word stash' + err.message);
    });
}



//let parse = require('csv-parse');
//let async = require('async');
//TODO: Promise that you'll change this to promises.
/* parse 'Top Words' and download apps based on the search results. */
// NOTE: word csv's are not comma seperated, actually '\n'...
// let parser = parse({ delimiter: ',' }, function(err, data) {
//     async.eachSeries(data, function(currWord, callback) {
//         scrapeWord(currWord).then(appsScraped => {

//             appsScraped.map(app => {
//                 log('Downloading app: '+ app.appId);
//                 downloadAppApk(app);
//             });

//             // when processing finishes invoke the callback to move to the next one
//             callback();
//         });
//     })
// });

// // Loop through all the files in the word stash
// fs.readdir(wordStash, function(err, files) {
//     if (err) {
//         logger.err('Could not list the directory.'+ err);
//         process.exit(1);
//     }

//     files.forEach(file => {
//         let p = require('path');
//         fs.createReadStream(p.join(wordStash,file)).pipe(parser);
//     });
// });
