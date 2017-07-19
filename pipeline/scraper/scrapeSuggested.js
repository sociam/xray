/**
 * Get the suggested search Autocompetes and find the apps associated with them.
 */


var gplay = require('google-play-scraper');
var alphabet = require('alphabet');
var _ = require('lodash');
var config = require('/etc/xray/config.json');
var fs = require('fs-extra');

var wordStoreLocation = config.wordStashDir + '/suggested_words.txt';

/**
 * Wipes a file at a specified location of text
 * @param {*Location of the file to be written to...} location 
 */
function wipeScrapedWords(location) {
    fs.writeFile(location, '', function(err) {
        if (err) {
            console.log(err.message);
        }
    })
}

/**
 *  Writes a word to a file at a specified location
 * @param {*The word to be written to a file...} word 
 * @param {*The location of the file to be written to...} location 
 */
function writeScrapedWords(word, location) {
    fs.appendFile(location, word + '\n', function(err) {
        if (err) {
            console.log(err.message);
        }
    })
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
};

/**
 * Creates a file of suggestions made by Google play when passing
 * the start of strings, eg. 'a', 'b', 'aa', 'ab' ...
 * 
 * @param {*The list of words used to get autocompletes} startingWords 
 */
function scrapeSuggestedWords(startingWords) {
    _.forEach(startingWords, (letter) => {
        gplay.suggest({ term: letter })
            .then(
                (suggestion) => {
                    _.forEach(suggestion, (word) => {
                        writeScrapedWords(word, wordStoreLocation);
                        // gplay.suggest({ term: word })
                        //     .then((suggestion) => {
                        //         _.forEach(suggestion, (suggestion) => {
                        //             // TODO: Output to a file for words.
                        //             writeScrapedWords(suggestion, wordStoreLocation);
                        //         })
                        //     })
                    })
                },
                (err) => console.log(err)
            );
    });
}

var single = alphabet.lower;
var double = cartesianProductChars(alphabet.lower, alphabet.lower);
var triple = cartesianProductChars(alphabet.lower, alphabet.lower, alphabet.lower);

charTriples = single.concat(double).concat(triple);

wipeScrapedWords(wordStoreLocation);
scrapeSuggestedWords(charTriples);