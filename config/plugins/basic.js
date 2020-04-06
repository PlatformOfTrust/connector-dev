"use strict";
/**
 * Basic authentication plugin.
 */

/**
 * Composes authorization header and
 * includes it to the http request options.
 *
 * @param {Object} authConfig
 * @param {Object} options
 * @return {Object}
 */
const request = async (authConfig, options) => {
    // Authorize request.
    options.headers = {
        Authorization: 'Basic ' + new Buffer(authConfig.username + ':' + authConfig.password).toString('base64')
    };
    return options;
};

/**
 * Expose plugin methods.
 */
module.exports = {
    name: 'basic',
    request
};
