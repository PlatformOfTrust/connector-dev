"use strict";
/**
 * Platform of Trust definitions.
 */

/** Default RSA key size for generated keys. */
const defaultKeySize = 4096;

/** URLs of Platform of Trust public keys. */
const publicKeyURLs = {
    sandbox: 'http://docs.oftrust.net/keys/sandbox/request_sign.pub',
    production: 'http://docs.oftrust.net/keys/production/request_sign.pub'
};

/** Context URLs. */
const contextURLs = {
    dataProduct: 'https://standards.lifeengine.io/v1/Context/Identity/Thing/HumanWorld/Product/DataProduct/'
};

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

module.exports = {
    defaultKeySize,
    publicKeyURLs,
    contextURLs,
    supportedHeaders
};
