/*

Download spawner process 

*/
const config = require('/etc/xray/config.json');
const logger = require('./logger.js');
const fs = require('fs-extra');
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

function resolveAPKDir(appData) {
    logger.debug('appdir: ' + appsSaveDir, '\nappId ' + appData.app, '\nappStore ' + appData.store, '\nregion ' + appData.region, '\nversion ' + appData.version);

    let appSavePath = path.join(appsSaveDir, appData.app, appData.store, appData.region, appData.version);
    logger.info('App desired save dir ' + appSavePath);

    return Promise.all([fs.pathExists(appSavePath), Promise.resolve(appSavePath)]);
}

function downloadApp(appData, appSavePath) {
    const args = ['-pd', appData.app, '-f', appSavePath, '-c', config.credDownload]; /* Command line args for gplay cli */
    const spw = require('child-process-promise').spawn;
    logger.debug('Passing args to downloader' + args);
    const apkDownloader = spw('gplaycli', args);

    let downloadProcess = apkDownloader.childProcess;

    mkdirp(appSavePath);
    logger.info('DL process %d for %s-%s started.', downloadProcess.pid, appData.app, appData.version);

    downloadProcess.stdout.on('data', data => {
        logger.debug('DL process %d stdout:', downloadProcess.pid, data.toString());
    });

    downloadProcess.stderr.on('data', data => {
        logger.warning('DL process %d stderr:', downloadProcess.pid, data.toString());
    });

    return apkDownloader;
}

function main() {
    db.queryAppsToDownload(10).then(apps => {
        return Promise.each(apps, async (app) => {
            logger.info('Performing download on', app.app);
            var appSavePath = resolveAPKDir(app);
            try {
                await downloadApp(app, appSavePath[1]);
            } catch(err) {
                logger.debug('Attempting to remove created dir');
                await fs.rmdir(appSavePath[1]).catch(logger.warning);
                logger.warning('Downloading failed with warn:', err.message);
            }

            try {
                await db.updateDownloadedApp(app);
            } catch (err) {
                // TODO: Maybe do something else? Destroying process as we have apks that don't exist in db...
                logger.err('Err when updated the downloaded app', err);
            }
        });
    }).catch(logger.warning);
}
main();
