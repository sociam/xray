'use strict';
const gplay = require('google-play-scraper');
const _ = require('lodash');
const Promise = require('bluebird');

const logger = require('../../util/logger');
var database = require('../../db/db');
var db = new database('retriever');

const region = 'us';

/**
 * Inserts app data into the db using db.js
 * @param {*The app data json that is to be inserted into the databae.} app_data 
 */
function insertAppData(app_data) {

    //Checking version data - correct version to update date
    if (!app_data.version || app_data.version === 'Varies with device') {
        logger.debug('Version not found defaulting too', app_data.updated);
        //let formatDate = app_data.updated.replace(/\s+/g, '').replace(',', '/');
        let formatDate = new Date(app_data.updated).toISOString().substring(0, 10);
        app_data.version = formatDate;
    }

    // push the app data to the DB
    return db.insertPlayApp(app_data, region);
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

    // TODO: Move this to DB.
    return await Promise.all(_.map(appDatas, async(app_data) => {
        logger.debug('inserting ' + app_data.title + ' to the DB');

        let appExists = await db.doesAppExist(app_data).catch(logger.err);
        if (!appExists) {
            return await insertAppData(app_data).catch(logger.err);
        } else {
            logger.debug('App already existing', app_data.appId);
            return Promise.reject('App Already Exists');
        }
    }));
}


(async() => {
    let dbRows = await db.getStaleSearchTerms();
    Promise.each(dbRows, async(dbRow) => {
        logger.info('searching for: ' + dbRow.search_term);
        return await fetchAppData(dbRow.search_term, 60, 1)
            .then(await db.updateLastSearchedDate(dbRow.search_term)
                .catch(logger.err))
            .catch(logger.err);
    });
})();
