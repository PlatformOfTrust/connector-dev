"use strict";
/**
 * Module dependencies.
 */
const winston = require('../../logger.js');
const httpntlm = require('httpntlm');
const request = require('request');
const response = require('./response');
const soap = require('soap');
const _ = require('lodash');
const fs = require('fs');

/**
 * SOAP library.
 *
 * Handles WSDL reading, SOAP client creation and remote function calling.
 */

/**
 * Writes received WSDL file to file system.
 *
 * @param {String} dir
 *   Directory name.
 * @param {String} data
 *   File contents.
 * @return {Promise}
 */
function writeSOAPFile(dir, data) {
    return new Promise(function (resolve, reject) {
        fs.writeFile(dir, data, function (err) {
            if (err) {
                winston.log('error', err.message);
                reject(err);
            } else resolve(data);
        });
    });
}

/**
 * Acquires WSDL file based on configuration.
 *
 * @param {Object} config
 * @return {Promise}
 */
function getWSDL(config) {
    const url = config.authConfig.url;
    const username = config.authConfig.username;
    const password = config.authConfig.password;

    if (config.plugins.find(p => p.name === 'soap-ntlm')) {
        /** NTLM authentication. */
        return new Promise((resolve, reject) => {
            httpntlm.get({
                url: url,
                password: password,
                username: username
            }, function (err, response) {
                if (err) reject(err);
                else resolve(response.body);
            });
        });
    } else {
        /** Basic authentication. */
        return new Promise((resolve, reject) => {
            request({url: 'http://' + username + ':' + password + '@' + url.replace('http://', '')},
                function (err, response, body) {
                    if (err) reject(err);
                    else resolve(body);
                }
            );
        });
    }
}

/**
 * Calls remote function.
 *
 * @param {Object} client
 * @param {String} path
 * @param {Object} args
 * @return {Promise}
 */
function executeRemoteFunction(client, path, args) {
    return new Promise((resolve, reject) => {
        _.get(client, path)(args, function (err, result, envelope, soapHeader) {
            // if (err) reject(err);
            if (err) resolve();
            else resolve(result)
        });
    });
}

/**
 * Initializes SOAP client.
 *
 * @param {Object} config
 * @param {String} url
 * @param {Array} pathArray
 * @return {Promise}
 */
const createSOAPClient = async (config, url, pathArray) => {
    const receivedData = [];
    const username = config.authConfig.username;
    const password = config.authConfig.password;
    const SOAPFunction = config.authConfig.soapPath;
    let options = {wsdl_headers: {Authorization: "Basic " + new Buffer(username + ":" + password).toString("base64")}};
    if (config.authConfig.type === 'soap-ntlm') {
        options = {};
    }

    return new Promise((resolve, reject) => {
        soap.createClient(url, options, async (err, client) => {
            if (err) {
                // Execute onerror plugin function.
                for (let i = 0; i < config.plugins.length; i++) {
                    if (!!config.plugins[i].onerror) {
                        return await config.plugins[i].onerror(config.authConfig, err);
                    }
                }
                winston.log('error', err.message);
                resolve();
            } else {
                // Execute request plugin function.
                config.plugins.filter(p => !!p.request).map(async (plugin) => {
                    client = await plugin.request(config.authConfig, client);
                });

                let data;
                for (let i = 0; i < pathArray.length; i++) {
                    data = await executeRemoteFunction(client, SOAPFunction, pathArray[i]);
                    if (data) {
                        if (_.isObject(data)) {
                            if (Object.keys(data).length > 0) {
                                if (data[Object.keys(data)[0]]) {
                                    receivedData.push(await response.handleData(config, pathArray[i], i, null, data));
                                }
                            }
                        }
                    }
                }
                resolve(receivedData);
            }
        });
    });
};

/**
 * Handles SOAP data request from connector.
 *
 * @param {Object} config
 * @param {Array} pathArray
 * @return {Promise}
 */
const getData = async (config, pathArray) => {
    let items = [];
    const WSDLDir = 'wsdl';
    const WSDLFile = './' + WSDLDir + '/' + encodeURI(config.productCode) + '.xml';

    // Create WSDL folder, if it does not exist.
    if (!fs.existsSync(WSDLDir)) {
        fs.mkdirSync(WSDLDir);
        winston.log('info', 'Created folder for WSDL files.');
    }

    // Download WSDL file, if it does not exist.
    if (fs.existsSync(WSDLFile)) {
        winston.log('info', 'Initiated SOAP connection ' + config.productCode);
        items = await createSOAPClient(config, WSDLFile, pathArray);
        winston.log('info', 'Closed SOAP connection ' + config.productCode);
    } else {
        winston.log('info', 'Started downloading WDSL file...');
        const downloadedWSDLFile = await getWSDL(config);
        winston.log('info', 'Download finished.');

        await writeSOAPFile(WSDLFile, downloadedWSDLFile);

        if (downloadedWSDLFile) {
            winston.log('info', 'Downloaded ' + encodeURI(config.productCode) + '.xml');
            items = await createSOAPClient(config, WSDLFile, pathArray);
        } else {
            winston.log('info', 'Failed to download ' + encodeURI(config.productCode) + '.xml');
        }
    }
    return Promise.resolve(items);
};

/**
 * Expose library functions.
 */
module.exports = {
    getData
};
