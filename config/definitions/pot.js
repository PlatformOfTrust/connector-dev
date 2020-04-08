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
    DataProduct: 'https://standards.lifeengine.io/v1/Context/Identity/Thing/HumanWorld/Product/DataProduct/'
};

module.exports = {
    defaultKeySize,
    publicKeyURLs,
    contextURLs
};
