#!/usr/bin/node
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const createError = require('http-errors');

const redisClient = require('./init_redis.js');
const { cacheToken, checkCacheForToken } = require('./cache_data');
require('dotenv').config({
    path: '../.env'
});

// saltsRounds to generate token
const saltRounds = 10;

// age of web tokens converted from days to seconds
const ageAccessToken = 2 * 60; // 5 minutes
const ageRefreshToken = 60 * 60; // 60 minutes

/**
 * Validates an access token. If the access token is expired,
 * the function creates a new one to be sent in the response
 * @param {*} accessToken - access token to be decoded
 * @param {*} userEmail - user's email address
 * @returns 
 */
const decodeAccessToken = (accessToken, userEmail) => {
    return new Promise((resolve, reject) => {
        jwt.verify(accessToken, process.env.JWT, async (error, token) => {
            if (error) {
                // For expired access tokens
                if (error.name === 'TokenExpiredError') {
                    // check cache for user refresh token
                    console.log(error.message);
                    const refreshToken = await checkCacheForToken(userEmail);
                    if (!refreshToken) {
                        console.log('No refresh token');
                        reject(createError.BadRequest());
                    }
                    const newToken = await createAccessToken(userEmail);
                    return resolve(newToken);

                } else {
                    reject(error);
                }

            }
            resolve(accessToken);
        })
    })
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next - goes to the next middleware in the stack
 * @returns 
 */
function verifyToken(req, res, next) {

    const { email, accessToken } = req.body;
    decodeAccessToken(accessToken, email)
        .then((token) => {
            res.locals.accessToken = token;
            return next();
        })
        .catch((error) => {
            return res.status(404).json({ error: "token verification unsuccessful" });
        })
}

/**
 * verifies the refresh token
 * @param {*} refreshToken 
 */
function verifyRefreshToken(refreshToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(refreshToken, process.env.REFRESH_JWT, async (error, decoded) => {
            if (error) {
                reject(createError.InternalServerError());
            }
            const userId = decoded.aud;

            // check cache for token
            const resultFromCache = await checkCacheForToken(userId);
            if (resultFromCache && resultFromCache === refreshToken) {
                return resolve(userId);
            } else {
                return reject(createError.BadRequest());
            }

        });
    });
}

/**
 * creates a json web token
 * @param: userId - user id
 */
function createAccessToken(userEmail) {

    return new Promise((resolve, reject) => {
        const options = {
            expiresIn: ageAccessToken,
            audience: userEmail
        }
        jwt.sign({ userEmail }, process.env.JWT, options, (error, token) => {
            if (error) {
                reject(error);
            }
            resolve(token);
        });
    })
}

/**
 * creates a fresh json web token
 * @param: userId - user id
 */
const createRefreshToken = (userEmail) => {
    return new Promise((resolve, reject) => {
        const options = {
            issuer: "Taiwo",
            expiresIn: ageRefreshToken,
            audience: userEmail
        }
        jwt.sign({}, process.env.REFRESH_JWT, options, async (error, token) => {
            if (error) {
                reject(createError.InternalServerError());
            }
            // check cache for token   
            const resultFromCache = await checkCacheForToken(userEmail);

            if (resultFromCache) {
                resolve(resultFromCache);
            } else {
                // cache the user id and refreshToken in redis
                const reply = await cacheToken(userEmail, token, ageRefreshToken);
                if (!reply) {
                    console.log('token caching fail', reply);
                    reject(createError.InternalServerError());
                } else {
                    console.log('token cached successfully', reply);
                    resolve(token);
                }
            }
        });
    });
}

/**
 * hashes a user password
 */
async function hashPassword(password) {

    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        console.log(error);
    }
}

/**
 * returns a boolean for hash comparison
 */
async function hashCompare(password, hash) {

    try {
        const match = await bcrypt.compare(password, hash);
        return match;
    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {
    ageAccessToken,
    ageRefreshToken,
    hashCompare,
    hashPassword,
    createAccessToken,
    createRefreshToken,
    verifyRefreshToken,
    verifyToken
}