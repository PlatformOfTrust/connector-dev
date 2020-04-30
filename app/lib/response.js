"use strict";
/**
 * Module dependencies.
 */
const winston = require('../../logger.js');
const moment = require('moment');
const _ = require('lodash');

/** Import response definitions. */
const {
    TIMESTAMP,
    VALUE,
    TYPE,
    DATA,
    ID
} = require('../../config/definitions/response');

/**
 * Combines keys and values from two arrays to an object.
 *
 * @param {Array} arrays
 * @return {Object}
 */
const mapArrays = function (arrays) {
    let dataObject = [];
    if (arrays.length >= 2) {
        if (Array.isArray(arrays[1][0])) {
            for (let a = 0; a < arrays[1].length; a++) {
                let object = {};
                for (let b = 0; b < arrays[1][a].length; b++) {
                    object[arrays[0][b]] = arrays[1][a][b];
                }
                dataObject.push(object);
            }
        } else {
            let object = {};
            for (let b = 0; b < arrays[1].length; b++) {
                object[arrays[0][b]] = arrays[1][b];
            }
            dataObject.push(object);
        }
        return dataObject;
    } else {
        return dataObject;
    }
};

/**
 * Picks value from response object by object property path or index.
 *
 * @param {Object} config
 * @param {String} path
 *   Resource path.
 * @param {Object} object
 *   Target object.
 * @param {String} key
 *   Config property key.
 * @return value
 */
function getValueFromResponse(config, path, object, key) {
    if (config[key]) {
        if (config[key].dataObjectProperty) {
            return _.get(object, config[key].dataObjectProperty);
        }
        if (config[key].pathIndex) {
            return path.split('/')[config[key].pathIndex];
        }
    }
    return undefined;
}

/**
 * Handles response data.
 *
 * @param {Object} config
 * @param {String} path
 * @param {Number} index
 * @param [APIData]
 * @param [SOAPData]
 * @return {Promise}
 */
const handleData = async (config, path, index, APIData, SOAPData) => {
    let data = {};
    if (!SOAPData) data = APIData;
    else data = SOAPData;

    // Execute response plugin function.
    for (let i = 0; i < config.plugins.length; i++) {
        if (!!config.plugins[i].response) {
            data = await config.plugins[i].response(config, data);
        }
    }

    // Validate data object.
    if (!_.isObject(data)) return Promise.resolve();
    if (Object.keys(data).length === 0) return Promise.resolve();

    if (!config.dataPropertyMappings || !config.dataObjects) {
        winston.log('error', 'Configuration dataPropertyMappings or dataObjects missing.');
        return Promise.resolve();
    }

    if (config.dataObjects.length < 1) {
        winston.log('error','Received data objects is empty.');
        return Promise.resolve();
    }

    // SOAP specific hardware id handling
    if (config.authConfig.type === 'soap'
        || config.authConfig.type === 'soap-basic'
        || config.authConfig.type === 'soap-ntlm') {
        data.hardwareId = path[Object.keys(path)[0]];
        path = '';
    }

    let measurements = [];

    for (let i = 0; i < config.dataObjects.length; i++) {

        let dataObjects = [];
        let dataObject = {};

        if (config.dataObjects[i] === '') dataObject = data;
        else if (Array.isArray(config.dataObjects[i])) {
            let arrays = [];
            for (let n = 0; n < config.dataObjects[i].length; n++) {
                arrays.push(_.get(data, config.dataObjects[i][n]))
            }
            dataObject = mapArrays(arrays);
        } else dataObject = _.get(data, config.dataObjects[i]);

        if (!Array.isArray(dataObject)) dataObjects.push(dataObject);
        else dataObjects = dataObject;

        for (let j = 0; j < dataObjects.length; j++) {

            // Look for hardwareId.
            let hardwareId = getValueFromResponse(config.generalConfig, path, dataObjects[j], 'hardwareId');

            // Look for timestamp.
            let timestamp = getValueFromResponse(config.generalConfig, path, dataObjects[j], 'timestamp');
            if (!timestamp) timestamp = moment.now();

            // Map data from the response data.
            let measurement = {
                timestamp: new Date(timestamp),
                data: {}
            };

            // Sometimes a timestamp in seconds is encountered and needs to be converted to millis.
            if (measurement.timestamp.getFullYear() === 1970) {
                measurement.timestamp = new Date(timestamp * 1000);
            }

            _.forIn(config.dataPropertyMappings, function (value, key) {
                if (config.dataPropertyMappings[Object.keys(config.dataPropertyMappings)[0]] === '') {
                    if (_.get(dataObjects[j], Object.keys(config.dataPropertyMappings)[0]) !== undefined
                        && _.get(dataObjects[j], Object.keys(config.dataPropertyMappings)[0]) !== null) {
                        measurement.data[Object.keys(config.dataPropertyMappings)[0]] = _.get(
                            dataObjects[j],
                            Object.keys(config.dataPropertyMappings)[0]
                        );
                    }
                } else {
                    if (_.get(dataObjects[j], value) !== undefined && _.get(dataObjects[j], value) !== null) {
                        measurement.data[key] = _.get(dataObjects[j], value);
                    }
                }
            });

            // Execute data plugin function.
            for (let i = 0; i < config.plugins.length; i++) {
                if (!!config.plugins[i].data) {
                    measurement.data = await config.plugins[i].data(config, measurement.data);
                }
            }

            // Check for objects to be included to every measurement.
            if (config.generalConfig.include) {
                _.forIn(config.generalConfig.include, function (value, key) {
                    measurement.data[key] = value;
                });
            }

            // Skip to next resource if the data did not pass the parsing operation.
            if (Object.keys(measurement.data).length === 0) continue;

            const item = {
                [ID || 'id']: hardwareId,
                [DATA || 'data']: []
            };

            // Format data
            for (let d = 0; d < Object.entries(measurement.data).length; d++ ) {
                item[DATA || 'data'].push({
                    [TYPE || 'type']: Object.entries(measurement.data)[d][0],
                    [VALUE || 'value']: Object.entries(measurement.data)[d][1],
                    [TIMESTAMP || 'timestamp']: measurement.timestamp,
                });
            }
            measurements.push(item);
        }
    }

    let mergedData = measurements;

    // Merge measurements with same hardwareId to same data array (history).
    try {
        let merged = {};
        for (let i = 0; i < measurements.length; i++ ) {
            if (!Object.hasOwnProperty.call(merged, measurements[i][ID || 'id'])) {
                merged[measurements[i][ID || 'id']] =  measurements[i];
            } else {
                merged[measurements[i][ID || 'id']][DATA || 'data']
                    = [...measurements[i][DATA || 'data'], ...merged[measurements[i][ID || 'id']][DATA || 'data']]
            }
        }
        mergedData = Object.values(merged);

        // Sort data arrays.
        for (let j = 0; j < mergedData.length; j++ ) {
            mergedData[j][DATA || 'data'] =
                mergedData[j][DATA || 'data']
                    .sort((a, b) => a[TIMESTAMP || 'timestamp'] - b[TIMESTAMP || 'timestamp']);

            // Execute id plugin function.
            for (let i = 0; i < config.plugins.length; i++) {
                if (!!config.plugins[i].id) {
                    mergedData[j][ID || 'id'] = await config.plugins[i].id(config, mergedData[j][ID || 'id']);
                }
            }

        }
    } catch (err) {
        winston.log('error', 'Failed to merge data. ' + err.message);
    }

    return Promise.resolve(mergedData);
};

/**
 * Expose library functions.
 */
module.exports = {
    handleData,
};

