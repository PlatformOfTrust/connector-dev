"use strict";
/**
 * Module dependencies.
 */
const crypto = require('crypto');
const moment = require('moment');
const winston = require('../../logger.js');

/**
 * RSA library.
 *
 * Handles key generation, signing, verifying and public key providing.
 */
let privateKey = process.env.PRIVATE_KEY;
let publicKey = process.env.PUBLIC_KEY;
let domain = process.env.TRANSLATOR_DOMAIN;

const defaultKeySize = 4096;

if (!privateKey || !publicKey) {

    // If RSA keys are not provided by environment variables,
    // they are generates with the default key size on load.

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
            winston.log('info', 'Generated RSA keys');
        } else {
            winston.log('error', err.message);
        }
    });
}

/**
 * Formats private key before it is used for signing.
 *
 * @param {String} str
 *   Private key.
 * @return {String}
 *   The formatted private key.
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
 * Wraps the base64 string to rows with a given length.
 *
 * @param {String} str
 *   Public key.
 * @param {Number} length
 *   The length of a single line
 * @return {String}
 *   The formatted public key.
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
 * Sends a public key response.
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
 * Generates a signature object for payload.
 *
 * @param {Object} reqBody
 *   The payload to sign.
 * @return {Object}
 *   The signature object.
 */
const generateSignature = function (reqBody) {
    // Sort request body.
    const body = {};
    Object.keys(reqBody).sort().forEach(k => {
        body[k] = reqBody[k]
    });

    // Initialize signature object.
    let signature = {
        type: 'RsaSignature2018',
        created: moment().format(),
        creator: 'https://' + domain + '/translator/v1/public.key',
    };

    // Create HMAC-SHA256 signature in base64 encoded format.
    try {
        signature.signatureValue = crypto.createHmac('sha256', Buffer.from(formatPrivateKey(privateKey), 'utf8'))
            .update(JSON.stringify({...body, __signed__: signature.created})
                .replace(/[\u007F-\uFFFF]/g, chr => '\\u' + ('0000' + chr.charCodeAt(0)
                    .toString(16)).substr(-4))
                .replace(new RegExp('":', 'g'), '": '))
            .digest('base64')
    } catch (err) {
        winston.log('error', err.message);
    }
    return signature;
};

/**
 * Validates a signature for given payload.
 *
 * @param {Object} reqBody
 *   The payload to validate.
 * @param {String} signature
 *   The signature to validate.
 * @param {String} publicKey
 *   The public key used for validating.
 * @return {Boolean}
 *   True if signature valid, False otherwise.
 */
const verifySignature = function (reqBody, signature, publicKey) {
    // Sort request body.
    const body = {};
    Object.keys(reqBody).sort().forEach(k => {
        body[k] = reqBody[k]
    });

    // Initialize verifier.
    const verifier = crypto.createVerify('sha256');

    // Create a string from the body object.
    const bodyString = JSON.stringify(body)
        .replace(/[\u007F-\uFFFF]/g, chr => '\\u' + ('0000' + chr.charCodeAt(0)
            .toString(16)).substr(-4))
        .replace(new RegExp('":', 'g'), '": ');
    verifier.update(bodyString);

    // Verify base64 encoded SHA256 signature.
    return verifier.verify(publicKey, signature,'base64')
};

/**
 * Expose library functions
 */

module.exports = {
    generateSignature,
    verifySignature,
    sendPublicKey,
};
