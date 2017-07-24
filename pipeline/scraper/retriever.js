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
    // push the app data to the DB
    db.insertPlayApp(app_data, region).then(
        (win) => logger.info('App Data inserted' + win),
        (err) => logger.err('Inserting play app failed: ' + err)
    );
}

function updateSearchedTermDate(searchTerm) {
    logger.debug('setting last search date to today: ' + searchTerm);
    db.updateLastSearchedDate(searchTerm);
}

// TODO Add Permission list to app Data JSON
function fetchAppData(searchTerm, numberOfApps, perSecond) {
    gplay.search({
        term: searchTerm,
        num: numberOfApps,
        throttle: perSecond,
        region: region,
        fullDetail: true
    }).then(
        (appDatas) => {
            _.forEach(
                appDatas,
                (app_data) => {
                    insertAppData(app_data);
                }
            );
        },
        (err) => logger.err(err.message)
    );
}

/**
 * uses db.js to fetch search terms from the database.
 */
function fetch_search_terms() {
    return db.getStaleSearchTerms();
}

fetch_search_terms().then(
    (dbRows) => {
        _.forEach(
            dbRows,
            (dbRow) => {
                logger.info('searching for: ' + dbRow.search_term);
                fetchAppData(dbRow.search_term, 4, 1);
                updateSearchedTermDate(dbRow.search_term);
            }
        );
    },
    (err) => logger.err(err)
);

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