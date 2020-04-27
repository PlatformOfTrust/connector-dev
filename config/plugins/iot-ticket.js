"use strict";
/**
 * IoT-Ticket path parameter encoding.
 */

/**
 * Checks if variable is object.
 *
 * @param {Object} a
 * @return {Boolean}
 */
const isObject = function(a) {
    return (!!a) && (a.constructor === Object);
};

/**
 * Manipulates request parameters.
 *
 * @param {Object} parameters
 * @return {Object}
 */
const parameters = async (parameters) => {
    try {
        if (Object.hasOwnProperty.call(parameters, 'ids')) {
            if (Array.isArray(parameters.ids)) {
                for (let i = 0; i < parameters.ids.length; i++) {
                    if (isObject(parameters.ids[i])) {
                        if (Object.hasOwnProperty.call(parameters.ids[i], 'path')) {
                            parameters.ids[i].path = encodeURI(parameters.ids[i].path);
                        }
                    }
                }
            }
        }
        return parameters;
    } catch (e) {
        return parameters;
    }
};

/**
 * Expose plugin methods.
 */
module.exports = {
    name: 'iot-ticket',
    parameters
};
