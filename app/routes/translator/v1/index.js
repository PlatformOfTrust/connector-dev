"use strict";
/**
 * Module dependencies.
 */
const router = require('express').Router();
const rsa = require('../../../lib/rsa');

/**
 * API routes.
 *
 * Application routes are defined in this file.
 * To add new routes, use router.<method>(<route>, <controller.action>)
 * or require index file from desired folder.
 */
module.exports = function (passport) {

    /** Public key. */
    router.get('/public.key', rsa.sendPublicKey);

    /** Status. */
    router.use('/health/', require('./health')(passport));

    /** Translator. */
    router.use('/fetch/', require('./fetch')(passport));

    return router;
};
