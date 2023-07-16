#!/usr/bin/node
const redisClient = require('./init_redis');

/**
 * caches refresh token for user authorization
 * @param {*} userId - user Id
 * @param {*} userToken - access token generated for user authorization
 * @param {*} tokenAge - valid time for which token can be used
 * @returns - true on successful caching, otherwise false
 */
async function cacheToken(userId, userToken, tokenAge) {
    // check for complete parameters
    if (!userId || !userToken || !tokenAge) {
        return false;
    }

    try {
        const reply = await redisClient.set(userId, userToken, {
            EX: tokenAge,
            NX: true
        });
        if (reply === 'OK') {
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

/**
 * check if token is available in redis memory
 * @param {*} userId 
 */
async function checkCacheForToken(userData) {
    if (!userData) {
        return null;
    }
    try {
        const reply = await redisClient.get(userData);
        return reply;
    } catch (error) {
        return null;
    }
}

module.exports = {
    checkCacheForToken,
    cacheToken
}