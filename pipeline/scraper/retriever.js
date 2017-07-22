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
function insert_app_data(app_data) {
    // push the app data to the DB
    logger.debug(app_data[0]);
    db.insertPlayApp(app_data, region).then(
        (win) => logger.info('App Data inserted' + win),
        (err) => logger.err('Inserting play app failed: ' + err)
    );
}

// TODO Add Permission list to app Data JSON
function fetch_app_data(search_term, number_of_apps, per_second) {
    gplay.search({
        term: search_term,
        num: number_of_apps,
        throttle: per_second,
        region: region,
        fullDetail: true
    }).then(
        (app_datas) => {
            _.forEach(
                app_datas,
                (app_data) => insert_app_data(app_data)
            );
        },
        (err) => logger.err(err.message)
    );
}

/**
 * uses db.js to fetch search terms from the database.
 */
function fetch_search_terms() {
    return db.get_search_terms();
}

fetch_search_terms().then(
    (db_rows) => {
        _.forEach(
            db_rows,
            (db_row) => {
                fetch_app_data(db_row.search_term, 4, 1);
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