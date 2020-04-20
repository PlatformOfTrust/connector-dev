"use strict";
/**
 * Module dependencies.
 */
const winston = require('../../logger.js');
const validator = require('./validator');
const cache = require('../cache');
const moment = require('moment');
const rest = require('./rest');
const _ = require('lodash');
const fs = require('fs');

/**
 * Connector library.
 *
 * Handles data fetching by product code specific configurations.
 */

/** Import platform of trust definitions. */
const {
    PRODUCT_CODE,
    TIMESTAMP,
    IDS,
    START,
    END,
    supportedParameters
} = require('../../config/definitions/request');

/** Supported connection protocols. */
const protocols = {
    local: require('./local'),
    rest: require('./rest'),
    soap: require('./soap')
};

const plugins = [];

// Set directory for config and template files.
const configDir = './config';
const pluginDir = './config/plugins';
const templateDir = './config/templates';

// Create plugin, config and template directory, if they do not exist.
if (!fs.existsSync(pluginDir)) fs.mkdirSync(pluginDir);
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir);

/**
 * Caches or requires file contents.
 *
 * @param {String} dir
 *   Directory to be scanned.
 * @param {String} ext
 *   Extension of the files to be scanned.
 * @param {String} collection
 *   Collection name.
 */
function loadFiles(dir, ext, collection) {
    fs.readdir(dir, function (err, files) {
        if (err) return console.log('Unable to scan directory: ' + err);
        files.forEach(function (file) {
            // Handle only files with .json file extension.
            if (file.substr(-ext.length) !== ext) return;
            fs.readFile(dir + '/' + file, 'utf8', function (err, data) {
                if (err) return winston.log('error', 'File read error', err.message);
                try {
                    switch (ext) {
                        /** JSON. */
                        case '.json':
                            cache.setDoc(collection, file.split('.')[0], JSON.parse(data));
                            winston.log('info', 'Loaded ' + dir + '/' + file + '.');
                            break;
                        /** JavaScript. */
                        case '.js':
                            plugins.push(require('../../config/plugins/' + file));
                            break;
                    }
                } catch (err) {
                    winston.log('error', err.message);
                }
            });
        });
    });
}

// Load plugins, configurations and templates
loadFiles(pluginDir, '.js', 'plugins');
loadFiles(configDir, '.json', 'configs');
loadFiles(templateDir, '.json', 'templates');

/**
 * Replaces placeholder/s with given value/s.
 *
 * @param {String/Object} template
 *   Template value.
 * @param {String/Object} placeholder
 *   Placeholder value.
 * @param {String} value
 *   Inserted value.
 * @return {String/Object}
 *   Template value with placeholder values.
 */
function replacer(template, placeholder, value) {
    let r = JSON.stringify(template);
    if (_.isObject(value)) {
        Object.keys(value).forEach(function (key) {
            r = r.replace('${' + key + '}', value[key])
        });
        // In case id placeholder is left untouched.
        if (r === '"${id}"' && Object.keys(value).length > 0) {
            // Place object to the id placeholder.
            r = r.replace('"${id}"', JSON.stringify(value))
        }
        return JSON.parse(r);
    } else {
        return JSON.parse(r.replace('${' + placeholder + '}', value));
    }
}

/**
 * Configures template with data product config (static)
 * and request parameters (dynamic).
 *
 * @param {Object} config
 *   Data product specific config.
 * @param {Object} template
 *   Connection template for external system.
 * @param {Object} params
 *   Parameters from broker API request.
 * @return {Object}
 *   Configured template.
 */
function replacePlaceholders(config, template, params) {
    // In case dynamic parameter object ´ids´ does not contain objects,
    // these elements will be converted from [x, y, ...] to [{id: x}, {id: y}, ...].
    // This will ease the following dynamic placeholder procedure.
    if (Object.hasOwnProperty.call(params, 'ids')) {
        for (let i = 0; i < params.ids.length; i++) {
            if (!_.isObject(params.ids[i])) {
                params.ids[i] = {id: params.ids[i]};
            }
        }
    }

    /** Static parameters. */
    if (Object.hasOwnProperty.call(config, 'static')) {
        template = replacer(template, null, config.static);
    }

    /** Dynamic parameters. */
    if (Object.hasOwnProperty.call(config, 'dynamic')) {
        Object.keys(config.dynamic).forEach(function (path) {
            const placeholder = config.dynamic[path];
            if (Object.hasOwnProperty.call(params, placeholder)) {
                const templateValue = _.get(template, path);
                if (Array.isArray(params[placeholder])) {
                    // Transform placeholder to array, if given parameters are in an array.
                    const array = [];
                    params[placeholder].forEach(function (element) {
                        array.push(replacer(templateValue, placeholder, element));
                    });
                    _.set(template, path, array);
                } else {
                    _.set(template, path, replacer(templateValue, placeholder, params[placeholder]));
                }
            }
        });
    }
    return template;
}

/**
 * Parses timestamp to date object.
 *
 * @param {String/Number} timestamp
 * @return {Date/String/Number}
 */
const parseTs = function (timestamp) {
    if (!timestamp) return timestamp;
    try {
        let parsed = new Date(timestamp);
        if (parsed.toString() === 'Invalid Date' || parsed.toString() === 'Invalid date') {
            // Try parsing the timestamp to integer.
            timestamp = Number.parseInt(timestamp);
            parsed = new Date(timestamp);
        }
        // Sometimes a timestamp in seconds is encountered and needs to be converted to millis.
        if (parsed.getFullYear() === 1970) parsed = new Date(timestamp * 1000);
        return parsed;
    } catch (err) {
        return timestamp;
    }
};

/**
 * Interprets mode (latest/history/prediction).
 *
 * @param {Object} config
 *   Data product specific config.
 * @param {Object} parameters
 *   Broker request parameters.
 * @return {Object}
 *   Config with mode.
 */
const interpretMode = function (config, parameters) {
    // Some systems require always start and end time and latest values cannot be queried otherwise.
    // Start and end times are set to match last 24 hours from given timestamp.
    // Limit property is used to include only latest values.
    const defaultTimeRange = 1000 * 60 * 60 * 24;

    // Latest by default.
    config.mode = 'latest';

    // Detect history request from start and end time
    if (parameters.start && parameters.end) {
        // Sort timestamp to correct order
        if (parameters.end < parameters.start) {
            const start = parameters.end;
            parameters.end = parameters.start;
            parameters.start = start;
        }
        config.mode = 'history';
        // Remove limit query property.
        if (Object.hasOwnProperty.call(config, 'generalConfig')) {
            if (Object.hasOwnProperty.call(config.generalConfig, 'query')) {
                delete config.generalConfig.query.properties.limit;
            }
        }
    } else {
        // Include default range.
        parameters.start = new Date(moment.now() - defaultTimeRange);
    }

    // Detect prediction request from end time
    if (parameters.end.getTime() > moment.now()) {
        config.mode = 'prediction';
    }

    // Save parameters to config.
    config.parameters = parameters;

    return config;
};

/**
 * Loads config by requested product code and retrieves template defined in the config.
 * Places static and dynamic parameters to the template as described.
 * Consumes described resources.
 *
 * @param {Object} reqBody
 * @return {Array}
 *   Data array.
 */
const getData = async (reqBody) => {
    /** Parameter validation */
    const validation = validator.validate(reqBody, supportedParameters);
    if (Object.hasOwnProperty.call(validation, 'error')) {
        if (validation.error) return rest.promiseRejectWithError(422, validation.error);
    }

    // Pick parameters from reqBody.
    const productCode = _.get(reqBody, PRODUCT_CODE) || 'default';
    const timestamp = parseTs(_.get(reqBody, TIMESTAMP) || moment.now());
    let parameters = {
        ids: _.uniq(_.get(reqBody, IDS) || []),
        start: parseTs(_.get(reqBody, START)),
        end: parseTs(_.get(reqBody, END) || timestamp)
    };

    // Get data product config
    let config = cache.getDoc('configs', productCode);
    if (!config) config = cache.getDoc('configs', 'default');
    if (!config) return rest.promiseRejectWithError(404, 'Data product config not found.');
    if (!Object.hasOwnProperty.call(config, 'template')) {
        return rest.promiseRejectWithError(404, 'Data product config template not defined.');
    }

    // Get data product config template
    let template = cache.getDoc('templates', config.template);
    if (!template) return rest.promiseRejectWithError(404, 'Data product config template not found.');

    // Template identifies connector settings for multiple configs.
    // ProductCode identifies requested data product.
    template.authConfig.template = config.template;
    template.productCode = productCode;

    // Execute parameters plugin function.
    for (let i = 0; i < template.plugins.length; i++) {
        const plugin = plugins.find(p => p.name === template.plugins[i]);
        if (!!plugin.parameters) {
            parameters = await plugin.parameters(parameters);
        }
    }

    // Places values defined in config to template.
    template = replacePlaceholders(config, template, parameters);

    // Interpret mode.
    template = interpretMode(template, parameters);

    // Check that authConfig exists.
    if (!Object.hasOwnProperty.call(template, 'authConfig')) {
        return rest.promiseRejectWithError(500, 'Insufficient authentication configurations.');
    }

    // Attach plugins.
    if (Object.hasOwnProperty.call(template, 'plugins')) {
        if (template.plugins.length !== plugins.filter(p => template.plugins.includes(p.name)).length) {
            return rest.promiseRejectWithError(500, 'Missing required plugins.');
        } else {
            template.plugins = plugins.filter(p => template.plugins.includes(p.name));
        }
    } else {
        template.plugins = [];
    }

    // Check that resource path is defined.
    if (!Object.hasOwnProperty.call(template.authConfig, 'resourcePath')) {
        return rest.promiseRejectWithError(500, 'Insufficient resource configurations.');
    }

    let pathArray = [];
    let path = template.authConfig.resourcePath;
    if (!Array.isArray(path)) pathArray.push(path);
    else pathArray = path;

    // Remove duplicates.
    pathArray = _.uniq(pathArray);

    // Initialize items array.
    let items = [];

    // Check that protocol is defined.
    if (!Object.hasOwnProperty.call(template, 'protocol')) {
        return rest.promiseRejectWithError(500, 'Connection protocol ' + template.protocol + ' not found.');
    } else {
        // Check that the protocol is supported.
        if (!Object.hasOwnProperty.call(protocols, template.protocol)) {
            return rest.promiseRejectWithError(500, 'Connection protocol ' + template.protocol + ' not supported.');
        } else {
            items = await protocols[template.protocol].getData(template, pathArray);
            if (!items) items = [];
        }
    }

    return Promise.resolve(_.flatten(items));
};

/**
 * Expose library functions.
 */
module.exports = {
    getData
};
