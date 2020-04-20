"use strict";
/**
 * Schneider id double encoding.
 */

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
                    parameters.ids[i] = encodeURIComponent(encodeURIComponent(parameters.ids[i]));
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
    name: 'schneider',
    parameters
};
