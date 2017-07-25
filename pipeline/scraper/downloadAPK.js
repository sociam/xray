/*

Download spawner process 

*/
const config = require('/etc/xray/config.json');

const logger = require('./logger.js');

const fs = require('fs');
const path = require('path');

let appsSaveDir = path.join(config.datadir, 'apps');
let region = 'us';
let appStore = 'play';


function mkdirp(appSavePath) {
    //bug dir branch code
}

function resolveAPKDir(appData) {
    //console.log('appdir:'+ config.datadir, '\nappId'+ appData.appId, '\nappStore'+ appStore, '\nregion'+ region, '\nversion'+ appData.version);
    //log('appdir:'+ config.appdir, '\nappId'+ appData.appId, '\nappStore'+ appStore, '\nregion'+ region, '\nversion'+ appData.version);
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
        logger.debug('DL process %d stdout:', downloadProcess.pid, data);
    });

    downloadProcess.stderr.on('data', data => {
        logger.warning('DL process %d stderr:', downloadProcess.pid, data);
    });

    return apkDownloader.catch((err) => logger.err('Error downloading app:', err));
}

function retreiveLatestApps() {

    
}

function main () {

    downloadApp(appData, appSavePath).catch((err) => {
                try {
                    fs.rmdir(appSavePath);
                } catch (err) {
                    // TODO: something
                }
                logger.warning('Downloading failed with error:', err.message);
                appData.isDownloaded = false;
                return Promise.resolve();
            });
}