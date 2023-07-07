#!/usr/bin/node
import redisClient from './init_redis.js';

/**
 * caches refresh token for user authorization
 * @param {*} userId - user Id
 * @param {*} userToken - access token generated for user authorization
 * @param {*} tokenAge - valid time for which token can be used
 * @returns - true on successful caching, otherwise false
 */
export async function cacheToken(userId, userToken, tokenAge) {
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
export async function checkCacheForToken(userId) {
    if (!userId) {
        return null;
    }
    try {
        const reply = await redisClient.get(userId);
        return reply;
    } catch (error) {
        return null;
    }
}