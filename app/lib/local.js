"use strict";
/**
 * Module dependencies.
 */
const response = require('./response');

/**
 * Local library.
 *
 * Handles local request composition. Returns data from local environment (test data).
 */

/**
 * Generates random value.
 *
 * @param {Number} min
 * @param {Number} max
 * @param {Number} decimalPlaces
 * @return {Number}
 */
const genRand = function (min, max, decimalPlaces) {
    const rand = Math.random() * (max - min) + min;
    const power = Math.pow(10, decimalPlaces);
    return Math.floor(rand * power) / power;
};

/**
 * Generates test data by id and time range.
 *
 * @param {String} id
 * @param {Array} range
 * @return {Array}
 */
const generateData = function (id, range) {
    let entry = {
        value: genRand(19, 26, 2),
        name: 'Sensor ' + id,
        id
    };
    if (range) {
        let data = [];
        let length = 1;
        if (range[0].toString() !== 'Invalid Date'
        && range[1].toString() !== 'Invalid Date') {
            length = Math.max(Math.floor((range[1].getTime() - range[0].getTime()) / 600000), 1);
        } else {
            range[0] = new Date.now();
        }
        for (let i = 0; i < length; i++) {
            data[i] = {
                timestamp: range[0].getTime() + i * 600000,
                value: genRand(19, 26, 2),
                name: 'Sensor ' + id,
                id
            }
        }
        return data;
    } else {
        return [entry]
    }
};

/**
 * Initiates data requests.
 *
 * @param {Object} config
 * @param {String} pathArray
 *   Resource path, which will be included to the request.
 * @return {Array}
 */
const getData = async (config, pathArray) => {
    let range;
    if (config.mode === 'history' || config.mode === 'prediction') {
        range = [config.parameters.start, config.parameters.end]
    }
    const items = [];
    for (let p = 0; p < pathArray.length; p++) {
        // Handle result by template settings.
        const item = await response.handleData(config, pathArray[p], p, generateData(pathArray[p], range));
        if (item) items.push(item);
    }
    return items;
};

/**
 * Expose library functions.
 */
module.exports = {
    getData
};
