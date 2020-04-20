"use strict";
/**
 * Module dependencies.
 */
const winston = require('../../logger.js');
const response = require('./response');
const rp = require('request-promise');

/**
 * REST library.
 *
 * Handles API request composition and response error handling.
 */

/**
 * Returns promise reject with error.
 *
 * @param {Number} [code]
 * @param {String/Object} [msg]
 *   Error message.
 * @param {String} [reference]
 *   Additional info about the cause of the error.
 * @return {Promise}
 */
const promiseRejectWithError = function (code, msg, reference) {
    let err = new Error();
    err.httpStatusCode = code || 500;
    err.reference = reference;
    err.message = msg || 'Internal Server Error.';
    return Promise.reject(err);
};

/**
 * Sends data request. Configures authentication of the request.
 *
 * @param {Object} config
 * @param {Object} options
 * @param {String} resourcePath
 * @return {Promise}
 */
const getDataByOptions = async (config, options, resourcePath) => {
    if (!config.url && !resourcePath) {
        return promiseRejectWithError(500, 'No url or resourcePath found in authConfig.');
    } else {
        // Compose query string.
        let queryString = '';
        if (options.query.length > 0) {
            queryString += '?';
            for (let i = 0; i < options.query.length; i++) {
                queryString += Object.keys(options.query[i])[0] + '=' + Object.values(options.query[i])[0];
                if (i !== (options.query.length - 1)) queryString += '&';
            }
            options.url += queryString;
        }

        // Remove temporary query array.
        delete options.query;

        return rp(options).then(function (result) {
            return Promise.resolve(result);
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }
};

/**
 * Handles erroneous response.
 *
 * @param {Object} config
 * @param {Error} err
 * @return {Promise}
 */
const handleError = async (config, err) => {
    winston.log('info', config.authConfig.template + ': Response with status code ' + err.statusCode);

    /** Connection error handling. */
    if (err.statusCode === 404
        || err.statusCode === 500
        || err.statusCode === 502
        || err.statusCode === 503
        || err.statusCode === 504
        || err.statusCode === 522
    ) {
        return promiseRejectWithError(err.statusCode, err.message);
    }

    // Execute onerror plugin function.
    for (let i = 0; i < config.plugins.length; i++) {
        if (!!config.plugins[i].onerror) {
            return await config.plugins[i].onerror(config.authConfig, err);
        }
    }

    // Give up.
    return promiseRejectWithError(err.statusCode, 'Internal Server Error.');
};

/**
 * Initiates data requests.
 *
 * @param {Object} config
 * @param {String} pathArray
 *   Resource path, which will be included to the resource url.
 * @return {Array}
 */
const getData = async (config, pathArray) => {
    const items = [];
    for (let p = 0; p < pathArray.length; p++) {
        const item = await requestData(config, pathArray[p], p);
        if (item) items.push(item);
    }
    return items;
};

/**
 * Parses body object from API response.
 *
 * @param {Object} response
 * @return {Object}
 */
const parseResBody = function (response) {
    let body = {};
    try {
        body = JSON.parse(response.body);
    } catch (e) {
        winston.log('error', 'Failed to parse response body.');
    }
    return body;
};

/**
 * Structures required information for data request.
 *
 * @param {Object} config
 * @param {String} resourcePath
 *   Resource path, which will be included to the request.
 * @param {Number} index
 * @return {Promise}
 */
const requestData = async (config, resourcePath, index) => {
    // Initialize request options.
    let method = 'GET';
    let options = {
        method: method,
        url: resourcePath.includes('://') ? resourcePath : config.authConfig.url + resourcePath,
        headers: config.authConfig.headers || {},
        resolveWithFullResponse: true,
        query: []
    };

    // Define start and end query properties
    if (config.generalConfig.query) {
        if (config.generalConfig.query.start) {
            options.query.push({
                [config.generalConfig.query.start]: config.parameters.start
            });
        }
        if (config.generalConfig.query.end) {
            options.query.push({
                [config.generalConfig.query.end]: config.parameters.end
            });
        }
        if (config.generalConfig.query.properties) {
            for (let property in config.generalConfig.query.properties) {
                if (Object.hasOwnProperty.call(config.generalConfig.query.properties, property)) {
                    options.query.push(config.generalConfig.query.properties[property]);
                }
            }
        }
    }

    // Execute request plugin function.
    for (let i = 0; i < config.plugins.length; i++) {
        if (!!config.plugins[i].request) {
            options = await config.plugins[i].request(config.authConfig, options);
        }
    }

    /** First attempt */
    return getDataByOptions(config.authConfig, options, resourcePath).then(function (result) {
        // Handle received data.
        if (result !== null) return response.handleData(config, resourcePath, index, parseResBody(result));
        // Handle connection timed out.
        return promiseRejectWithError(522, 'Connection timed out.');
    }).then(function (result) {
        // Return received data.
        return Promise.resolve(result);
    }).catch(function (err) {
        if (Object.hasOwnProperty.call(err, 'statusCode')) {
            if (err.statusCode === 404) {
                return Promise.resolve([]);
            }
        }
        return handleError(config, err).then(function () {
            /** Second attempt */
            // If error handler recovers from the error, another attempt is initiated.
            return getData(config, resourcePath);
        }).then(function (result) {
            // Handle received data.
            if (result !== null) return response.handleData(config, resourcePath, index, parseResBody(result));
            return promiseRejectWithError(522, 'Connection timed out.');
        }).then(function (result) {
            // Return received data.
            return Promise.resolve(result);
        }).catch(function (err) {
            return Promise.reject(err);
        });
    });
};

/**
 * Expose library functions.
 */
module.exports = {
    getData,
    promiseRejectWithError
};
