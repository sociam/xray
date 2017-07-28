var gplay = require('google-play-scraper');
const alphabet = require('alphabet');
const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');

const logger = require('../../util/logger');
const DB = require('../../db/db');
var db = new DB('explorer');

/**
 * Wipes a file at a specified location of text
 * @param {*Location of the file to be written to...} location 
 */
function wipeScrapedWords(location) {
    fs.writeFile(location, '', function(err) {
        if (err) {
            logger.err(err.message);
        }
    });
}

/**
 *  Writes a word to a file at a specified location
 * @param {*The word to be written to a file...} word 
 * @param {*The location of the file to be written to...} location 
 */
function writeScrapedWords(word, location) {
    fs.appendFile(location, word + '\n', function(err) {
        if (err) {
            logger.err(err.message);
        }
    });
}


/**
 * Used returns an array where each line is a search term.
 * @param {*the location of the file that is to be read} file_location 
 */
function openSearchTerms(file_location) {
    return fs.readFileSync(file_location).toString().split('\n');
}

/**
 * Parses a file of search terms, adding each line as a search term to the DB
 * @param {*Location of a file to import search terms from} file_location 
 */
function importFileTerms(file_location) {
    _.forEach(
        openSearchTerms(file_location),
        (search_term) => db.insertSearchTerm(search_term)
    );
}


/**
 * Creates a cartesion product of arrays of strings.
 * 
 * Eg, ['a', 'b', 'c'] x2 => ['aa' ''ab' 'ac' 'ba' 'bb'] ...
 */
function cartesianProductChars() {
    return _.reduce(arguments, function(a, b) {
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x + y;
            });
        }), true);
    }, [
        []
    ]);
}

/**
 * Creates a file of suggestions made by Google play when passing
 * the start of strings, eg. 'a', 'b', 'aa', 'ab' ...
 * 
 * @param {*The list of words used to get autocompletes} startingWords 
 */
// TODO: Store scraped word to the Database not txt
function scrapeSuggestedWords(startingWords) {
    //TODO: return array of suggested search terms
    Promise.each(startingWords, (letter) => {
        return gplay.suggest({ term: letter, throttle: 10 })
            .then((suggestion) => {
                Promise.each(suggestion, async(word) => {
                    logger.debug('Inserting to DB: ' + word);
                    return await db.insertSearchTerm(word).catch((err) => logger.err(err));
                }).catch(logger.err);
            }).catch(logger.err);
    });
}

// TODO this stuff needs moving somewhere...
var single = alphabet.lower;
var double = cartesianProductChars(alphabet.lower, alphabet.lower);
var triple = cartesianProductChars(alphabet.lower, alphabet.lower, alphabet.lower);

var charTriples = single.concat(double).concat(triple);

scrapeSuggestedWords(charTriples);
