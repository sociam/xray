'use strict';
/*global require, module */

const config = require('/etc/xray/config.json');
const pg = require('pg');
const logger = require('./logger.js');

class DB {
    constructor(module) {
        //WISHLIST: initialise pool for desired db option from the config here.
        var db_cfg = config.db;
        db_cfg.user = config[module].db.user;
        db_cfg.password = config[module].db.password;
        db_cfg.max = 10;
        db_cfg.idleTimeoutMillis = 30000;

        //this initializes a connection pool
        //it will keep idle connections open for 30 seconds
        //and set a limit of maximum 10 idle clients
        this.pool = new pg.Pool(db_cfg);

        this.pool.on('error', function(err) {
            logger.err('idle client error', err.message, err.stack);
        });
    }

    //export the query method for passing queries to the pool
    query(text, values) {
        if (values) logger.debug('query:', text, values);
        else logger.debug('query:', text, values);
        return this.pool.query(text, values);
    }

    async connect() {
        logger.debug('connecting to db pool');
        let ret = await this.pool.connect();
        ret.lquery = (text, values) => {
            if (values) logger.debug('lquery:', text, values);
            else logger.debug('lquery:', text);
            return ret.query(text, values);
        };

        return ret;
    }

    async insertDev(dev) {
        try {
            var res = await this.query('SELECT id FROM developers WHERE $1 = ANY(email)', [dev.email]);
            if (res.rowCount > 0) {
                logger.debug('developer with email %s exists', dev.email);
                return res.rows[0].id;
            }

            logger.debug('inserting developer with email %s', dev.email);

            // maybe dev id needs to be URL encoded?
            let store_site = 'https://play.google.com/store/apps/developer?id=' + dev.id;
            res = await this.query('INSERT INTO developers(email,name,store_site,site) VALUES ($1, $2, $3, $4) RETURNING id', [
                [dev.email], dev.name, store_site, dev.site
            ]);
        } catch (err) { logger.err(err); }
        return res.rows[0].id;
    }

    async getAppData() {
        logger.debug('Fetching Search Terms');
        var res = await this.query('SELECT search_term FROM search_terms WHERE age(last_searched) > interval \'1 month\'');
        logger.debug(res.rows.length + ' terms fetched');
        return res.rows;
    }

    /**
     *  Query the search_terms table to get a list of terms that are stale
     */
    async getStaleSearchTerms() {
        logger.debug('Fetching Search Terms');
        var res = await this.query('SELECT search_term FROM search_terms WHERE age(last_searched) > interval \'1 month\'');
        logger.debug(res.rows.length + ' terms fetched');
        return res.rows;
    }

    /**
     * Sets the last_searched date of a specified search term to be the current date.
     * Used to track 'stale' search terms.
     */
    async updateLastSearchedDate(searchTerm) {
        logger.debug('Setting last searched date for ' + searchTerm + ' to current date');
        var client = await this.connect();
        logger.debug('connected');

        logger.debug('checking if ' + searchTerm + ' exists in db.');
        var check_res = await client.lquery('SELECT search_term FROM search_terms WHERE search_term = $1', [searchTerm]);
        logger.debug(check_res.rowCount + ' rows found for ' + searchTerm);
        if (check_res.rowCount > 0) {
            logger.debug(searchTerm + ' exists, updating last searched date.');
            var update_res = await client.lquery('UPDATE search_terms SET last_searched = CURRENT_DATE WHERE search_term = $1', [searchTerm]);
        }
        client.release();
        return update_res;
    }

    /**
     *  Add a search term to the table if it doesn't already exist.
     */
    async insertSearchTerm(searchTerm) {
        var client = await this.connect();
        logger.debug('Connected');

        logger.debug('Checking if ' + searchTerm + ' exists before adding to search_terms');
        var checkRes = await client.lquery('SELECT search_term FROM search_terms WHERE search_term = $1', [searchTerm]);

        if (checkRes.rowCount == 0) {
            try {
                await client.lquery('BEGIN');
                await client.lquery('INSERT INTO search_terms VALUES ($1, \'epoch\')', [searchTerm]);
                logger.debug(searchTerm + ' added to DB');
                await client.lquery('COMMIT');
            } catch (err) {
                logger.err('Error with previous query:', err);
                await client.lquery('ROLLBACK');
            } finally {
                client.release();
            }
        } else {
            logger.debug('%s already exists, skipping.', searchTerm);
            client.release();
        }
    }

    /**
     *  Check if app already exists in the apps DB. used before attempting to log again.
     */
    async doesAppExist(app) {
        var res = await this.query('SELECT * FROM apps WHERE id = $1', [app.appId]);
        logger.debug('app query res count: ' + res.rowCount);
        return (res.rowCount > 0);
    }

    /**
     *  Inserts App Data scraped from the google play store into the DB.
     */
    async insertPlayApp(app, region) {

        var devId = await this.insertDev({
            name: app.developer,
            id: app.developerId,
            email: app.developerEmail,
            site: app.developerWebsite
        });


        var appExists = false,
            verExists = false;
        var verId;
        var res = await this.query('SELECT * FROM apps WHERE id = $1', [app.appId]);

        if (res.rowCount > 0) {
            appExists = true;
            // app exists in database, check if version does as well
            var res1 = await this.query(
                'SELECT id FROM app_versions WHERE app = $1 AND store = $2 AND region = $3 AND version = $4', [app.appId, 'play', region, app.version]);

            if (res1.rowCount > 0) {
                // app version is also in database
                verExists = true;
                verId = res1.rows[0].id;
            }
        }

        var client = await this.connect();
        logger.debug('Connected');

        await client.lquery('BEGIN'); // maybe this should be inside the try?
        try {
            if (!verExists) {
                if (!appExists) {
                    await client.lquery('INSERT INTO apps VALUES ($1, $2)', [app.appId, []]);
                }

                let res = await client.lquery(
                    'INSERT INTO app_versions(app, store, region, version, downloaded) VALUES ($1, $2, $3, $4, $5) RETURNING id', [app.appId, 'play', region, app.version, 0]
                );
                verId = res.rows[0].id;

                await client.lquery('UPDATE apps SET versions=versions || $1 WHERE id = $2', [
                    [verId], app.appId
                ]);

            }

            await client.lquery(
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
            await client.lquery('COMMIT');
        } catch (e) {
            await client.lquery('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        return verId;
    }

}

module.exports = DB;