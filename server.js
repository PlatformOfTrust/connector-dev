"use strict";
/**
 * Module dependencies.
 */
const fs = require('fs');
const helmet = require('helmet');
const express = require('express');
const passport = require('passport');
const winston = require('./logger.js');
const bodyParser = require('body-parser');
const compression = require('compression');

// Initiate app.
const app = express();

// Load environment variables.
require('dotenv').config();

/**
 * Express middleware.
 */
app.use(helmet());
app.use(compression());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Disable HTTP Header Fingerprinting
app.disable('x-powered-by');

// Configure passport.
require('./config/passport')(passport);

// Set up routes for app.
require('./app/routes/index').app(app, passport);

// Catch 404 and forward to error handler.
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Set error handler for app.
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.status(err.status || 500).send({success: false, message: 'Internal Server Error. ' + err.message});
});

// Set error handler for HTTP server.
const handler = function (err) {
    if (err.errno === 'EADDRINUSE') {
        winston.log('error', 'port ' + port + ' is in use already');
    } else {
        winston.log('error', err.message);
    }
};

// Set callback for HTTP server.
const callback = function (port) {
    winston.log('info', 'Translator API started on port: ' + port);
};

let server;
const port = process.env.PORT || 3000;

// Start HTTP server.
if (process.env.GREENLOCK_MAINTANER) {
    /**
     * Greenlock Express v4 configuration.
     */
    let config = { sites: []};
    const configDir = './greenlock.d';
    const configFile = configDir + '/config.json';
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
    if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify(config), 'utf8');

    // Configure domain
    try {
        config = JSON.parse(fs.readFileSync(configFile).toString());
        if (config.sites.length === 0) {
            config.sites.push({
                subject: process.env.TRANSLATOR_DOMAIN,
                altnames: [process.env.TRANSLATOR_DOMAIN]
            });
            fs.writeFileSync(configFile, JSON.stringify(config), 'utf8');
        }
    } catch (err) {
        winston.log('error', err.message);
    }
    server = require("greenlock-express").init({
        packageRoot: __dirname,
        configDir,
        maintainerEmail:  process.env.GREENLOCK_MAINTANER,
        cluster: false
    }).serve(app);
} else {
    server = require('http').createServer(app).listen(port, callback(port)).on('error', handler);
}
