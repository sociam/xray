'use strict';
//const config = require('/etc/xray/config.json'); //See example_config.json
const gplay = require('google-play-scraper');
const logger = require('./logger.js');
const _ = require('lodash');
const db = require('./db.js');

/**
 * Inserts app data into the db using db.js
 * @param {*The app data json that is to be inserted into the databae.} app_data 
 */
function insert_app_data(app_data) {
    // push the app data to the DB
    logger.debug(app_data); // for now 
    db.insertPlayApp(app_data);
}

// TODO Add Permission list to app Data JSON
function fetch_app_data(search_term, number_of_apps, per_second) {
    gplay.search({
        term: search_term,
        num: number_of_apps,
        throttle: per_second,
        fullDetail: true
    }).then(
        (app_data) => insert_app_data(app_data),
        (err) => logger.err(err.message)
    );
}

/**
 * uses db.js to fetch search terms from the database.
 */
function fetch_search_terms() {
    return db.get_search_terms();
}

_.forEach(
    // open_search_terms(config.datadir + '/suggested_words.txt'),
    fetch_search_terms(),
    (search_term) => {
        logger.info(search_term);
        fetch_app_data(search_term, 4, 1);
    }
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