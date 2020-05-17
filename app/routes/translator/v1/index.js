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

    /** Status.
     *
     * @swagger
     * /translator/v1/health:
     *   get:
     *     description: Health check.
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Server up and running.
     */
    router.use('/health/', require('./health')(passport));

    /** Translator.
     *
     * @swagger
     * /translator/v1/fetch:
     *   get:
     *     description: Returns data.
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Data fetched successfully.
     */
    router.use('/fetch/', require('./fetch')(passport));

    return router;
};
