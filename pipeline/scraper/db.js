'use strict';
/*global require, module */

const config = require('/etc/xray/config.json');
const pg = require('pg');
const logger = require('./logger.js');

var db_cfg = config.scraper.db;
db_cfg.max = 10;
db_cfg.idleTimeoutMillis = 30000;

//this initializes a connection pool
//it will keep idle connections open for 30 seconds
//and set a limit of maximum 10 idle clients
const pool = new pg.Pool(db_cfg);

pool.on('error', function(err) {
    logger.err('idle client error', err.message, err.stack);
});

//export the query method for passing queries to the pool
function query(text, values) {
    logger.debug('query:', text, values);
    return pool.query(text, values);
}

// the pool also supports checking out a client for
// multiple operations, such as a transaction
function connect() {
    return pool.connect();
}

async function insertDev(dev) {
    try {
        var res = await query('SELECT id FROM developers WHERE $1 = ANY(email)', [dev.email]);
        if (res.rowCount > 0) {
            logger.debug('developer with email %s exists', dev.email);
            return res.rows[0].id;
        }

        logger.debug('inserting developer with email %s', dev.email);

        // maybe dev id needs to be URL encoded?
        let store_site = 'https://play.google.com/store/apps/developer?id=' + dev.id;
        res = await query('INSERT INTO developers(email,name,store_site,site) VALUES ($1, $2, $3, $4) RETURNING id', [
            [dev.email], dev.name, store_site, dev.site
        ]);
    } catch (err) { logger.err(err); }
    return res.rows[0].id;
}

class DB {
    constructor(dbOption) {
        this.dbOption = dbOption;
        //WISHLIST: initialise pool for desired db option from the config here.
    }

    async getStaleSearchTerms() {
        logger.debug('Fetching Search Terms');
        var res = await query('SELECT search_term FROM search_terms WHERE age(last_searched) > interval \'1 month\'');
        logger.debug(res.rows.length + ' terms fetched');
        return res.rows;
    }

    async updateLastSearchedDate(searchTerm) {
        logger.debug('Setting last searched date for ' + searchTerm + ' to current date');
        var client = await connect();
        logger.debug('connected');

        logger.debug('checking if ' + searchTerm + ' exists in db.');
        var check_res = await client.query('SELECT search_term FROM search_terms WHERE search_term = $1', [searchTerm]);
        logger.debug(check_res.rowCount + ' rows found for ' + searchTerm);
        if (check_res.rowCount > 0) {
            logger.debug(searchTerm + ' exists, updating last searched date.');
            var update_res = await client.query('UPDATE search_terms SET last_searched = CURRENT_DATE WHERE search_term = $1', [searchTerm]);
        }

        return update_res;
    }

    async insertSearchTerm(searchTerm) {
        var client = await connect();
        logger.debug('Connected');

        logger.debug('Checking if ' + searchTerm + ' exists before adding to search_terms');
        var checkRes = await client.query('SELECT search_term FROM search_terms WHERE search_term = $1', [searchTerm]);

        if (checkRes.rowCount == 0) {
            try {
                await client.query('BEGIN');
                await client.query('INSERT INTO search_terms VALUES ($1, \'epoch\')', [searchTerm]);
                logger.debug(searchTerm + ' added to DB');
                await client.query('COMMIT');
            } catch (err) {
                logger.err(err);
                await client.query('ROLLBACK');
                logger.err('DB Rolled Back');
            } finally {
                client.release();
            }
        }
    }

    async doesAppExist(app) {
        var res = await query('SELECT * FROM apps WHERE id = $1', [app.appId]);
        logger.debug('app query res count: ' + res.rowCount);
        return (res.rowCount > 0);
    }

    async insertPlayApp(app, region) {

        var devId = await insertDev({
            name: app.developer,
            id: app.developerId,
            email: app.developerEmail,
            site: app.developerWebsite
        });


        var appExists = false,
            verExists = false;
        var verId;
        var res = await query('SELECT * FROM apps WHERE id = $1', [app.appId]);

        if (res.rowCount > 0) {
            appExists = true;
            // app exists in database, check if version does as well
            var res1 = await query(
                'SELECT id FROM app_versions WHERE app = $1 AND store = $2 AND region = $3 AND version = $4', [app.appId, 'play', region, app.version]);

            if (res1.rowCount > 0) {
                // app version is also in database
                verExists = true;
                verId = res1.rows[0].id;
            }
        }

        var client = await connect();
        logger.debug('Connected');

        await client.query('BEGIN'); // maybe this should be inside the try?
        try {
            if (!verExists) {
                if (!appExists) {
                    await client.query('INSERT INTO apps VALUES ($1, $2)', [app.appId, []]);
                }

                let res = await client.query(
                    'INSERT INTO app_versions(app, store, region, version, downloaded) VALUES ($1, $2, $3, $4, $5) RETURNING id', [app.appId, 'play', region, app.version, 0]
                );
                verId = res.rows[0].id;

                await client.query('UPDATE apps SET versions=versions || $1 WHERE id = $2', [
                    [verId], app.appId
                ]);

            }

            await client.query(
                'INSERT INTO playstore_apps VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, current_date)', [
                    verId,
                    app.title,
                    app.summary,
                    app.description,
                    app.url,
                    app.price,
                    app.free,
                    app.score,
                    app.reviews,
                    app.genreId,
                    app.familyGenreId,
                    app.minInstalls,
                    app.maxInstalls,
                    devId,
                    app.updated,
                    app.androidVersion,
                    app.contentRating,
                    app.screenshots,
                    app.video,
                    app.recentChanges
                ]);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        return verId;
    }

}

/**
 *  Query the search_terms table to get a list of terms that are stale
 */

/**
 * Sets the last_searched date of a specified search term to be the current date.
 * Used to track 'stale' search terms.
 */
/**
 *  Add a search term to the table if it doesn't already exist.
 */

/**
 *  Check if app already exists in the apps DB. used before attempting to log again.
 */

/**
 *  Inserts App Data scraped from the google play store into the DB.
 */

module.exports = DB;

// module.exports = {
//     /**
//      *  Query the search_terms table to get a list of terms that are stale
//      */
//     getStaleSearchTerms: async() => {
//         logger.debug('Fetching Search Terms');
//         var res = await query('SELECT search_term FROM search_terms WHERE age(last_searched) > interval \'1 month\'');
//         logger.debug(res.rows.length + ' terms fetched');
//         return res.rows;
//     },

//     /**
//      * Sets the last_searched date of a specified search term to be the current date.
//      * Used to track 'stale' search terms.
//      */
//     updateLastSearchedDate: async(search_term) => {
//         logger.debug('Setting last searched date for ' + search_term + ' to current date');
//         var client = await connect();
//         logger.debug('connected');

//         logger.debug('checking if ' + search_term + ' exists in db.');
//         var check_res = await client.query('SELECT search_term FROM search_terms WHERE search_term = $1', [search_term]);
//         logger.debug(check_res.rowCount + ' rows found for ' + search_term);
//         if (check_res.rowCount > 0) {
//             logger.debug(search_term + ' exists, updating last searched date.');
//             var update_res = await client.query('UPDATE search_terms SET last_searched = CURRENT_DATE WHERE search_term = $1', [search_term]);
//         }

//         return update_res;
//     },

//     /**
//      *  Add a search term to the table if it doesn't already exist.
//      */
//     insertSearchTerm: async(searchTerm) => {

//         var client = await connect();
//         logger.debug('Connected');

//         logger.debug('Checking if ' + searchTerm + ' exists before adding to search_terms');
//         var checkRes = await client.query('SELECT search_term FROM search_terms WHERE search_term = $1', [searchTerm]);

//         if (checkRes.rowCount == 0) {
//             try {
//                 await client.query('BEGIN');
//                 await client.query('INSERT INTO search_terms VALUES ($1, \'epoch\')', [searchTerm]);
//                 logger.debug(searchTerm + ' added to DB');
//                 await client.query('COMMIT');
//             } catch (err) {
//                 logger.err(err);
//                 await client.query('ROLLBACK');
//                 logger.err('DB Rolled Back');
//             } finally {
//                 client.release();
//             }
//         }
//     },

//     doesAppExist: async(app) => {
//         var res = await query('SELECT * FROM apps WHERE id = $1', [app.appId]);
//         return (res.rowCount > 0);
//     },


//     insertPlayApp: async(app, region) => {

//         var devId = await insertDev({
//             name: app.developer,
//             id: app.developerId,
//             email: app.developerEmail,
//             site: app.developerWebsite
//         });


//         var appExists = false,
//             verExists = false;
//         var verId;
//         var res = await query('SELECT * FROM apps WHERE id = $1', [app.appId]);

//         if (res.rowCount > 0) {
//             appExists = true;
//             // app exists in database, check if version does as well
//             var res1 = await query(
//                 'SELECT id FROM app_versions WHERE app = $1 AND store = $2 AND region = $3 AND version = $4', [app.appId, 'play', region, app.version]);

//             if (res1.rowCount > 0) {
//                 // app version is also in database
//                 verExists = true;
//                 verId = res1.rows[0].id;
//             }
//         }

//         var client = await connect();
//         logger.debug('Connected');

//         await client.query('BEGIN'); // maybe this should be inside the try?
//         try {
//             if (!verExists) {
//                 if (!appExists) {
//                     await client.query('INSERT INTO apps VALUES ($1, $2)', [app.appId, []]);
//                 }

//                 let res = await client.query(
//                     'INSERT INTO app_versions(app, store, region, version, downloaded) VALUES ($1, $2, $3, $4, $5) RETURNING id', [app.appId, 'play', region, app.version, 0]
//                 );
//                 verId = res.rows[0].id;

//                 await client.query('UPDATE apps SET versions=versions || $1 WHERE id = $2', [
//                     [verId], app.appId
//                 ]);

//             }

//             await client.query(
//                 'INSERT INTO playstore_apps VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, current_date)', [
//                     verId,
//                     app.title,
//                     app.summary,
//                     app.description,
//                     app.url,
//                     app.price,
//                     app.free,
//                     app.score,
//                     app.reviews,
//                     app.genreId,
//                     app.familyGenreId,
//                     app.minInstalls,
//                     app.maxInstalls,
//                     devId,
//                     app.updated,
//                     app.androidVersion,
//                     app.contentRating,
//                     app.screenshots,
//                     app.video,
//                     app.recentChanges
//                 ]);
//             await client.query('COMMIT');
//         } catch (e) {
//             await client.query('ROLLBACK');
//             throw e;
//         } finally {
//             client.release();
//         }
//         return verId;
//     }
// };

if (!module.parent) {
    query('SELECT * FROM developers');
}