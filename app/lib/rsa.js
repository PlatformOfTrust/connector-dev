"use strict";
/**
 * Module dependencies.
 */
const crypto = require('crypto');
const moment = require('moment');
const cache = require('../cache');
const request = require('request');
const winston = require('../../logger.js');

/**
 * RSA library.
 *
 * Handles key generation, signing, verifying and public key providing.
 */

/** Platform of Trust related definitions. */
const {defaultKeySize, publicKeyURLs} = require('../../config/definitions/pot');

/** Mandatory environment variables. */
let domain = process.env.TRANSLATOR_DOMAIN;

/** Optional environment variables. */
let privateKey = process.env.PRIVATE_KEY;
let publicKey = process.env.PUBLIC_KEY;

if (!privateKey || !publicKey) {

    // If RSA keys are not provided by environment variables,
    // they are generated on load with the default key size.

    crypto.generateKeyPair('rsa', {
        modulusLength: defaultKeySize,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    }, (err, pubKey, privKey) => {
        if (!err) {
            privateKey = privKey;
            publicKey = pubKey;
            winston.log('info', 'Generated RSA keys.');
        } else {
            winston.log('error', err.message);
        }
    });
}

/**
 * Reads public keys from Platform of Trust resources.
 */
const readPublicKeys = function () {
    for (let environment in publicKeyURLs) {
        if (Object.hasOwnProperty.call(publicKeyURLs, environment)) {
            request(publicKeyURLs[environment], function (err, response, body) {
                if (err) {
                    winston.log('error', err.message);
                } else {
                    cache.setDoc('publicKeys', environment, body.toString())
                }
            });
        }
    }
};

// Initiate public keys reading.
readPublicKeys();

/**
 * Formats private key before it is used for signing.
 *
 * @param {String} str
 *   Private key.
 * @return {String}
 *   Formatted private key.
 */
function formatPrivateKey(str) {
    const begin = '-----BEGIN PRIVATE KEY-----';
    const end = '-----END PRIVATE KEY-----';
    return str
        .replace(begin, '')
        .replace(end, '');
}

/**
 * Formats public key.
 * Wraps base64 string to rows by given length.
 *
 * @param {String} str
 *   Public key.
 * @param {Number} length
 *   Length of a single line
 * @return {String}
 *   Formatted public key.
 */
function formatPublicKey(str, length) {
    const begin = '-----BEGIN PUBLIC KEY-----';
    const end = '-----END PUBLIC KEY-----';
    return begin + '\n' + str
        .replace(begin, '')
        .replace(end, '')
        .match(new RegExp('.{1,' + length + '}', 'g'))
        .join('\n') + '\n' + end;
}

/**
 * Sends public key response.
 *
 * @param {Object} req
 * @param {Object} res
 */
const sendPublicKey = function (req, res) {
    res.setHeader('Content-type', "application/octet-stream");
    res.setHeader('Content-disposition', 'attachment; filename=public.key');
    res.send(formatPublicKey(publicKey, 64));
};

/**
 * Stringifies body object.
 *
 * @param {Object} body
 * @return {String}
 *   Stringified body.
 */
const stringifyBody = function (body) {
    // Sort request body.
    const sortedBody = {};
    Object.keys(body).sort().forEach(k => {
        sortedBody[k] = body[k]
    });

    if (Object.hasOwnProperty.call('parameters')) {
        const sortedParameters = {};
        Object.keys(body).parameters.sort().forEach(k => {
            sortedParameters[k] = body.parameters[k]
        });
        sortedBody.parameters = sortedParameters;
    }

    // Return string.
    return JSON.stringify(sortedBody)
        .replace(/[\u007F-\uFFFF]/g, chr => '\\u' + ('0000' + chr.charCodeAt(0)
            .toString(16)).substr(-4)).replace(new RegExp('":', 'g'), '": ');
};

/**
 * Generates signature object for given payload.
 *
 * @param {Object} body
 *   The payload to sign.
 * @param {String} [key]
 *   Private key.
 * @return {Object}
 *   The signature object.
 */
const generateSignature = function (body, key) {
    // Use local private key, if not given.
    if (!key) key = privateKey;

    // Initialize signature object.
    let signature = {
        type: 'RsaSignature2018',
        created: moment().format(),
        creator: 'https://' + domain + '/translator/v1/public.key',
    };

    // Create HMAC-SHA256 signature in base64 encoded format.
    try {
        signature.signatureValue = crypto
            .createSign('sha256')
            .update(stringifyBody({...body, __signed__: signature.created}))
            .sign({key, padding: crypto.constants.RSA_PKCS1_PSS_PADDING}, 'base64');
    } catch (err) {
        winston.log('error', err.message);
    }
    return signature;
};

/**
 * Validates signature for given payload.
 *
 * @param {Object} body
 *   Payload to validate.
 * @param {String} signature
 *   Signature to validate.
 * @param {String/Object} publicKey
 *   Public key used for validation.
 * @return {Boolean}
 *   True if signature is valid, false otherwise.
 */
const verifySignature = function (body, signature, publicKey) {
    // Initialize verifier.
    const verifier = crypto.createVerify('sha256');

    // Update verifier.
    verifier.update(stringifyBody(body));

    // Verify base64 encoded SHA256 signature.
    return verifier.verify(publicKey, signature, 'base64')
};

/**
 * Expose library functions.
 */
module.exports = {
    generateSignature,
    verifySignature,
    sendPublicKey,
};
