/*

Download spawner process 

*/
const config = require('/etc/xray/config.json');
const logger = require('./logger.js');
const fs = require('fs-extra');
const util = require('util');
const path = require('path');
const DB = require('./db');
const db = new DB('downloader');
const Promise = require('bluebird');

let appsSaveDir = path.join(config.datadir, 'apps');

function mkdirp(dir) {
    dir.split(path.sep).reduce((parentDir, childDir) => {
        const curDir = path.join(parentDir, childDir);
        if (!fs.existsSync(curDir)) {
            fs.mkdirSync(curDir);
        }
        return curDir;
    }, path.isAbsolute(dir) ? path.sep : '');
}

async function resolveAPKDir(appData) {
    logger.debug('appdir: ' + appsSaveDir, '\nappId ' + appData.app, '\nappStore ' + appData.store, '\nregion ' + appData.region, '\nversion ' + appData.version);

    let appSavePath = path.join(appsSaveDir, appData.app, appData.store, appData.region, appData.version);
    logger.info('App desired save dir ' + appSavePath);


    await mkdirp(appSavePath);

    return appSavePath;
}

function downloadApp(appData, appSavePath) {
    const args = ['-pd', appData.app, '-f', appSavePath, '-c', config.credDownload]; /* Command line args for gplay cli */
    const spw = require('child-process-promise').spawn;
    logger.debug('Passing args to downloader' + args);
    const apkDownloader = spw('gplaycli', args);

    let downloadProcess = apkDownloader.childProcess;

    logger.info('DL process %d for %s-%s started.', downloadProcess.pid, appData.app, appData.version);

    downloadProcess.stdout.on('data', data => {
        logger.debug('DL process %d stdout:', downloadProcess.pid,
            data.toString().replace(/\n/g, util.format('\nDL process %d stdout: ', downloadProcess.pid)));
    });

    downloadProcess.stderr.on('data', data => {
        logger.warning('DL process %d stderr:', downloadProcess.pid,
            data.toString().replace(/\n/g, util.format('\nDL process %d stderr: ', downloadProcess.pid)));
    });

    return apkDownloader;
}

async function main() {
    for (;;) {
        try {
            var apps = await db.queryAppsToDownload(4000);
        } catch(err) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }
      
        await Promise.each(apps, async(app) => {

            logger.info('Starting download attempt for:', app.app);
            db.updatedDlAttempt(app); // Could be move to the call to DL app. but this is where the whole DL process starts.
            try {
                var appSavePath = await resolveAPKDir(app);
            } catch (err) {
                await new Promise(resolve => setTimeout(resolve, 6000));
                return Promise.reject('Did not have access to resolve dir', err.message);
            }

            try {
                await downloadApp(app, appSavePath);
            } catch(err) {
                logger.debug('Attempting to remove created dir');
                await fs.rmdir(appSavePath).catch(logger.warning);
                return Promise.reject('Downloading failed with err:', err.message);
            }

            try {	
                if(fs.existsSync(path.join(appSavePath, app.app + '.apk'))) {
                    await db.updateDownloadedApp(app);
                }
            } catch (err) {
                // TODO: Maybe do something else? Destroying process as we have apks that don't exist in db...
                return Promise.reject('Err when updated the downloaded app', err);
            }
        }).catch(logger.err);
    }
}

main();
