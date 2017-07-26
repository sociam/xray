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
    logger.info('appdir: ' + appsSaveDir, '\nappId ' + appData.app, '\nappStore ' + appData.store, '\nregion ' + appData.region, '\nversion ' + appData.version);

    let appSavePath = path.join(appsSaveDir, appData.app, appData.store, appData.region, appData.version);
    logger.info('App desired save dir ' + appSavePath);

    return Promise.all([fs.pathExists(appSavePath), Promise.resolve(appSavePath)]);
}

function downloadApp(appData, appSavePath) {
    const args = ['-pd', appData.app, '-f', appSavePath, '-c', config.credDownload]; /* Command line args for gplay cli */
    const spw = require('child-process-promise').spawn;
    logger.info('Passing args to downloader' + args);
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

    return apkDownloader; //.catch((err) => logger.err('Error downloading app:', err.message));
}

function main() {
    db.queryAppsToDownload(10).then(apps => {
        Promise.each(apps, (app) => {
            logger.info('Performing download on ', app.app);
            return resolveAPKDir(app)
                .then(async(appSavePath) => {
                    return await downloadApp(app, appSavePath[1]).then(() => {
                        db.updateDownloadedApp(app)
                            .catch((err) => {
                                logger.err('Err when updated the downloaded app', err);
                            });
                    }).catch((err) => {
                        try {
                            logger.debug('Attempting to remove created dir');
                            fs.rmdir(appSavePath);
                        } catch (err) {
                            logger.debug('The directory was never orginally created...', appsSaveDir);
                        }
                        logger.warning('Downloading failed with warn:', err.message);
                    });

                });
        });
    });
}
main();
