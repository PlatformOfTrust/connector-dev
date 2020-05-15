"use strict";
/**
 * Platform of Trust definitions.
 */

/** Default RSA key size for generated keys. */
const defaultKeySize = 4096;

/** URLs of Platform of Trust public keys. */
const publicKeyURLs = [
    /** Primary keys. */
    {
        env: 'production',
        url: 'https://static.oftrust.net/keys/jwt.pub'
    },
    {
        env: 'sandbox',
        url: 'https://static-sandbox.oftrust.net/keys/jwt.pub'
    },
    /** Secondary keys. */
    {
        env: 'production',
        url: 'https://static.oftrust.net/keys/jwt-secondary.pub'
    },
    {
        env: 'sandbox',
        url: 'https://static-sandbox.oftrust.net/keys/jwt-secondary.pub'
    },
    /** Old keys. */
    {
        env: 'production',
        url: 'http://docs.oftrust.net/keys/production/request_sign.pub'
    },
    {
        env: 'sandbox',
        url: 'http://docs.oftrust.net/keys/sandbox/request_sign.pub'
    }
];

/** Context URLs. */
const contextURLs = {
    DataProduct: 'https://standards.lifeengine.io/v1/Context/Identity/Thing/HumanWorld/Product/DataProduct/'
};

/**
 * Expose definitions.
 */
module.exports = {
    defaultKeySize,
    publicKeyURLs,
    contextURLs
};
