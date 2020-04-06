"use strict";
/**
 * Module dependencies.
 */
const soap = require('soap');
/**
 * SOAP basic authentication plugin.
 */

/**
 * Configures SOAP authentication.
 *
 * @param {Object} authConfig
 * @param {Object} options
 * @return {Object}
 */
const request = async (authConfig, options) => {
    // Authorize request.
    try {
        options.setSecurity(new soap.BasicAuthSecurity(authConfig.username, authConfig.password));
    } catch (err) {
        console.log(err.message);
    }
    return options;
};

/**
 * Expose plugin methods.
 */
module.exports = {
    name: 'soap-basic',
    request
};
