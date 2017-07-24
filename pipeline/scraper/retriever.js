'use strict';
//const config = require('/etc/xray/config.json'); //See example_config.json
const gplay = require('google-play-scraper');
const logger = require('./logger.js');
const _ = require('lodash');
const db = require('./db.js');

const region = 'us';

/**
 * Inserts app data into the db using db.js
 * @param {*The app data json that is to be inserted into the databae.} app_data 
 */
function insertAppData(app_data) {
    //Checking version data - correct version to update date
    if (!app_data.version || app_data.version === 'Varies with device') {
        logger.debug('Version not found defaulting too', app_data.updated);
        let formatDate = app_data.updated.replace(/\s+/g, '').replace(',', '/');
        app_data.version = formatDate;
    }

    // push the app data to the DB
    return db.insertPlayApp(app_data, region);
}

function updateSearchedTermDate(searchTerm) {
    logger.debug('setting last search date to today: ' + searchTerm);
    db.updateLastSearchedDate(searchTerm);
}

// TODO Add Permission list to app Data JSON
async function fetchAppData(searchTerm, numberOfApps, perSecond) {
    let appDatas = await gplay.search({
        term: searchTerm,
        num: numberOfApps,
        throttle: perSecond,
        region: region,
        fullDetail: true
    });

    await Promise.all(_.map(appDatas, async(app_data) => {
        logger.debug('inserting ' + app_data.title + ' to the DB');
        await insertAppData(app_data);
    }));
}

/**
 * uses db.js to fetch search terms from the database.
 */
async function fetch_search_terms() {
    return await db.getStaleSearchTerms();
}

(async () => {
    let dbRows = await fetch_search_terms();
    let p = Promise.resolve();
    _.forEach(dbRows, (dbRow) => {
        p = p.then(async () => {
            logger.info('searching for: ' + dbRow.search_term);
            await fetchAppData(dbRow.search_term, 4, 1);
            await updateSearchedTermDate(dbRow.search_term);
        });
    });
    return await p;
})();

/**
 *  Example of promise to fetch permissions from Google Play Store.
 */
// gplay.permissions({
//     appId: 'com.dxco.pandavszombies',
//     short: true
// }).then(
//     (app) => logger.info(app),
//     (err) => logger.err(err.message)
// );