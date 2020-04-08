"use strict";
/**
 * Module dependencies.
 */
const cache = require('../cache');
const rsa = require('../lib/rsa');
const SignatureStrategy = require('./strategies/signature').SignatureStrategy;

/**
 * Passport authentication configurations.
 *
 * Configures strategies, which are extensible set of plugins.
 */

/** Import platform of trust definitions. */
const { supportedHeaders } = require('../../config/definitions/request');

/**
 * Extracts identity id from Platform of Trust token.
 */
const extractId = function (token) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('binary')).sub
};

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
            /** Header validation */
            for (let header in supportedHeaders) {
                if (Object.hasOwnProperty.call(supportedHeaders, header)) {
                    if (!Object.hasOwnProperty.call(req.headers, header)) {
                        if (supportedHeaders[header].required) return done(null, false, {message: 'Missing required header ' + header});
                    }
                }
            }

            /** Signature validation */
            let verified = false;
            let environment;
            let publicKeys = cache.getDocs('publicKeys');
            for (let env in publicKeys) {
                if (Object.hasOwnProperty.call(publicKeys, env)) {
                    // Verify the payload and signature against the Platform of Trust public key.
                    if (rsa.verifySignature(req.body, signature, publicKeys[env])) {
                        verified = true;
                        environment = env;
                    }
                }
            }
            if (!verified) return done(null, false, {message: 'Signature validation failed'});

            /*
            let user = {
                '@id': extractId(req.headers['x-user-token'])
            };
             */

            let app = {
                '@id': extractId(req.headers['x-app-token'])
            };

            // Attach identity details and additional info.
            return done(null, app, {
                environment,
                scope: '*'
            });
        }
    ));
};
