'use strict';
//const config = require('/etc/xray/config.json'); //See example_config.json
const gplay = require('google-play-scraper');
const logger = require('./logger.js');
const _ = require('lodash');
const fs = require('fs');
const db = require('./db.js');

// TODO: Store App Data to the DB
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

// TODO: Query DB for Search Terms
function fetch_search_terms() {
    return db.get_search_terms();
}

function open_search_terms(file_location) {
    return fs.readFileSync(file_location).toString().split('\n');
}

_.forEach(
    // open_search_terms(config.datadir + '/suggested_words.txt'),
    fetch_search_terms(),
    (search_term) => fetch_app_data(search_term, 4, 1)
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