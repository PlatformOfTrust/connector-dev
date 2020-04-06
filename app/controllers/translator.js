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
    let result;
    try {
        result = {
            "@context": "https://...jsonld",
            "data": {
                "items": []
            }
        };

        // Fetch data.
        result.data.items = await connector.getData(req.body);

        // Send signed data response.
        return res.status(200).send({
            ...result,
            signature: rsa.generateSignature(result)
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
