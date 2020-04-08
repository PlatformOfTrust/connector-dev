"use strict";
/**
 * Broker request definitions.
 */

/** List of supported headers, and if they're required or not. */
const supportedHeaders = {
    'x-pot-signature': {
        required: true
    },
    'x-app-token': {
        required: true
    },
    'x-user-token': {
        required: false
    }
};

/** List of supported parameters, and if they're required or not. */
const supportedParameters = {
    PRODUCT_CODE: {
        value: 'productCode',
        required: true
    },
    TIMESTAMP: {
        value: 'timestamp',
        required: true
    },
    PARAMETERS: {
        value: 'parameters',
        required: true
    },
    IDS: {
        value: 'parameters.ids',
        required: true
    },
    START: {
        value: 'parameters.startTime',
        required: false
    },
    END: {
        value: 'parameters.endTime',
        required: false
    }
};

module.exports = {
    supportedHeaders,
    supportedParameters
};
