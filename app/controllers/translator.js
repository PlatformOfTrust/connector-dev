"use strict";
/**
 * Module dependencies.
 */
const rsa = require('../lib/rsa');
const connector = require('../lib/connector');

/**
 * Translator controller.
 *
 * Handles fetching and returning of the data.
 */

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
    let result = {
        "@context": "https://standards.oftrust.net/contexts/product-data.jsonld",
        "data": {
            "items": []
        }
    };
    result.data.items = await connector.getData({});
    return res.status(200).send({...result, signature: rsa.generateSignature(result)});
};
