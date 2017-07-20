'use strict';
const config = require('/etc/xray/config.json'); //See example_config.json
const gplay = require('google-play-scraper');
const logger = require('./logger.js');
const _ = require('lodash');
const fs = require('fs');

function store_app_data(app_data) {
    // push the app data to the DB
    logger.info(app_data); // for now
}

function fetch_app_data(search_term, number_of_apps, per_second) {
    gplay.search({
        term: search_term,
        num: number_of_apps,
        throttle: per_second,
        fullDetail: true
    }).then(
        (app_data) => store_app_data(app_data),
        (err) => logger.err(err.message)
    );
}

function fetch_search_terms() {
    // fetch from DB
}

function open_search_terms(file_location) {
    return fs.readFileSync(file_location).toString().split('\n');
}

_.forEach(
    open_search_terms(config.datadir + '/suggested_words.txt'),
    (search_term) => fetch_app_data(search_term, 1, 1)
);