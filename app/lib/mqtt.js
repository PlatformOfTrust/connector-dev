"use strict";
/**
 * Module dependencies.
 */
const fs = require('fs');
const mqtt = require('mqtt');
const response = require('./response');
const winston = require('../../logger.js');
const cache = require('../../app/cache');

const clients = {};

/**
 * Queries measurements cache.
 *
 * @param {Object} config
 * @param {String} pathArray
 *   Resource path, which will be included to the resource url.
 * @return {Array}
 */
const getData = async (config, pathArray) => {
    const items = [];
    for (let p = 0; p < pathArray.length; p++) {
        try {
            const result = cache.getDoc('measurements', config.productCode);
            const id = Object.keys(result).find(i => i.includes(config.generalConfig.hardwareId.dataObjectProperty));
            if (id) items.push(response.handleData(config, pathArray[p], p, result[id]));
        } catch (e) {
            console.log(e.message);
        }
    }
    return items;
};

/**
 * Connects to MQTT broker.
 *
 * @param {Object} config
 * @param {String} productCode
 */
const connect = function (config, productCode) {
    const url = config.static.url;
    const topic = config.static.topic;
    clients[productCode] = mqtt.connect(url, {
        key:  fs.readFileSync(config.static.key),
        cert: fs.readFileSync(config.static.cert),
    });

    clients[productCode].on('connect', () => {
        clients[productCode].subscribe(topic);
        winston.log('info', productCode + ' subscribed to topic ' + topic + '.');
    });

    clients[productCode].on('message', (topic, message) => {
        try {
            const result = cache.getDoc('measurements', productCode) || {};
            result[topic] = JSON.parse(message.toString());
            cache.setDoc('measurements', productCode, result);
        } catch (e) {
            console.log(e.message)
        }
        clients[productCode].end();
    });
};

/**
 * Expose library functions.
 */
module.exports = {
    connect,
    getData
};
