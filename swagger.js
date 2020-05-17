"use strict";
/**
 * Module dependencies.
 */
const swaggerJSDoc = require('swagger-jsdoc');

/**
 * Create swagger specification.
 */

// Swagger definition.
const swaggerDefinition = {
    info: {
        title: 'Connector',
        version: '1.0.0',
        description: 'HTTP server to handle Platform of Trust Broker API requests.',
    },
    basePath: '/',
};

// Options for the swagger docs.
const options = {
    // Import swaggerDefinitions.
    swaggerDefinition,
    // Path to the API docs.
    apis: [
        './app/routes/translator/v1/index.js'
    ],
};

/**
 * Returns swagger-jsdoc.
 *
 * @param {String} [domain]
 * @return {Object}
 */
const swaggerSpec = (domain) => {
    if (domain) options.swaggerDefinition.host = 'https://' + domain;
    return swaggerJSDoc(options);
};

/**
 * Expose function to generate specification.
 */
module.exports = swaggerSpec;
