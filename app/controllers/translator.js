"use strict";
/**
 * Module dependencies.
 */
const moment = require('moment');
const rsa = require('../lib/rsa');
const connector = require('../lib/connector');

/**
 * Translator controller.
 *
 * Handles fetching and returning of the data.
 */

/** Mandatory environment variable. */
let domain = process.env.TRANSLATOR_DOMAIN;

/** Import contextURL definitions. */
const contextURLs = require('../../config/definitions/pot').contextURLs;

/**
 * Returns the data to the PoT Broker API
 * based on the parameters sent.
 *
 * @param {Object} req
 * @param {Object} res
 * @return
 *   The translator data.
 */
module.exports.fetch = async (req, res) => {
    let result;
    const type = 'DataProduct';
    try {
        result = {
            "@context": contextURLs[type],
            "data": {
                "@context": contextURLs[type],
                "@type": type,
                "items": []
            }
        };

        // Fetch data.
        result.data.items = await connector.getData(req.body);

        // Initialize signature object.
        let signature = {
            type: 'RsaSignature2018',
            created: moment().format(),
            creator: 'https://' + domain + '/translator/v1/public.key',
        };

        // Send signed data response.
        return res.status(200).send({
            ...result,
            signature: {
                ...signature,
                signatureValue: rsa.generateSignature({...result, __signed__: signature.created})
            }
        });
    } catch (err) {
        // Compose error response object.
        result = {
            error: {
                status: err.httpStatusCode || 500,
                message: err.message || 'Internal Server Error.'
            }
        };

        // Send response.
        return res.status(err.httpStatusCode || 500).send(result);
    }
};
