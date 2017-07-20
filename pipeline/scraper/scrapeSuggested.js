/**
 * Get the suggested search Autocompetes and find the apps associated with them.
 */


var gplay = require('google-play-scraper');
var alphabet = require('alphabet');
var _ = require('lodash');
var config = require('/etc/xray/config.json');
var fs = require('fs-extra');
var logger = require('./logger.js');
var wordStoreLocation = config.datadir + '/suggested_words.txt';

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
function scrapeSuggestedWords(startingWords) {
    //TODO: return array of suggested search terms
    _.forEach(startingWords, (letter) => {
        gplay.suggest({ term: letter, throttle: 10 })
            .then(
                (suggestion) => {
                    _.forEach(suggestion, (word) => {
                        logger.info('Logging Term: ' + word);
                        writeScrapedWords(word, wordStoreLocation);
                    });
                },
                (err) => logger.err(err)
            );
    });
}

// TODO this stuff needs moving to a seperate Explorerer.
var single = alphabet.lower;
var double = cartesianProductChars(alphabet.lower, alphabet.lower);
var triple = cartesianProductChars(alphabet.lower, alphabet.lower, alphabet.lower);

var charTriples = single.concat(double).concat(triple);

wipeScrapedWords(wordStoreLocation);
scrapeSuggestedWords(charTriples);