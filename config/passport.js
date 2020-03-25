"use strict";
/**
 * Module dependencies.
 */
const request = require('request');
const rsa = require('../app/lib/rsa');
const winston = require('../logger.js');
const SignatureStrategy = require('./strategies/signature').SignatureStrategy;

/**
 * Passport authentication configurations.
 *
 * Configures strategies, which are extensible set of plugins.
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

/** URLs of Platform of Trust public keys. */
const publicKeyURLs = {
    sandbox: 'http://docs.oftrust.net/keys/sandbox/request_sign.pub',
    production: 'http://docs.oftrust.net/keys/production/request_sign.pub'
};

/**
 * Reads public keys from Platform of Trust resources
 */
const readPublicKeys = function () {
    for (let environment in publicKeyURLs) {
        if (Object.hasOwnProperty.call(publicKeyURLs, environment)) {
            request(publicKeyURLs[environment], function (err, response, body) {
                if (err) {
                    winston.log('err', err.message);
                } else {
                    if (!Object.hasOwnProperty.call(publicKeys, environment)) {
                        publicKeys[environment] = body.toString();
                    }
                }
            });
        }
    }
};

/**
 * Extracts identity id from Platform of Trust token
 */
const extractId = function (token) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('binary')).sub
};

/** Variable to store received public keys. */
let publicKeys = {};

// Initiate public keys reading.
readPublicKeys();


/**
 * Expose passport configurations.
 */

module.exports = function (passport) {

    /**
     * Configures passport signature strategy.
     */
    passport.use('signature', new SignatureStrategy({
            passReqToCallback: true
        },
        function (req, signature, done) {
            /** Header validation. */
            for (let header in supportedHeaders) {
                if (Object.hasOwnProperty.call(supportedHeaders, header)) {
                    if (!Object.hasOwnProperty.call(req.headers, header)) {
                        if (supportedHeaders[header].required) return done(null, false, { message: 'Missing required header ' + header});
                    }
                }
            }

            /** Signature validation. */
            let verified = false;
            let environment;
            for (let env in publicKeys) {
                if (Object.hasOwnProperty.call(publicKeys, env)) {
                    // Verify the payload and signature against the Platform of Trust public key
                    if (rsa.verifySignature(req.body, signature, publicKeys[env])) {
                        verified = true;
                        environment = env;
                    }
                }
            }
            if (!verified) return done(null, false, { message: 'Signature validation failed' });

            /*
            let user = {
                '@id': extractId(req.headers['x-user-token'])
            };
             */

            let app = {
                '@id': extractId(req.headers['x-app-token'])
            };

            // Attach identity details and additional info
            return done(null, app, {
                environment,
                scope: '*'
            });
        }
    ));
};
