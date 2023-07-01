#!/usr/bin/node
import jwt from 'jsonwebtoken';
import * as bcrypt from "bcrypt";

// saltsRounds to generate token
const saltRounds = 10;

// age of web tokens converted from days to seconds
export const ageAccessToken = 60; // 1 minute
export const ageRefreshToken = 10 * 60; // 10 minutes


/**
 * verifies the json web token
 */
export function verifyToken(req, res, next) {

    try {
        const accessToken = req.body.accessToken;
        const decodedToken = jwt.verify(accessToken, process.env.JWT);

    } catch (error) {
        console.log(error);
        if (error.name === 'TokenExpiredError') {
            return res.status(404).json({ status: error.message, success: false });
        }
        return res.status(404).json({ status: "Not found", success: false });
    }
    next();
}

/**
 * verifies the refresh token
 * @param {*} refreshToken 
 */
export function verifyRefreshToken(refreshToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(refreshToken, process.env.REFRESH_JWT, (error, decoded) => {
            if (error) {
                reject(error);
            }
            const userId = decoded.aud;
            resolve(userId);
        });
    });
}

/**
 * creates a json web token
 * @param: userId - user id
 */
export const createAccessToken = (userId) => {

    return new Promise((resolve, reject) => {
        const options = {
            expiresIn: ageAccessToken,
        }
        jwt.sign({ userId }, process.env.JWT, options, (error, token) => {
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
export const createRefreshToken = (userId) => {
    return new Promise((resolve, reject) => {
        const options = {
            issuer: "Taiwo",
            expiresIn: ageRefreshToken,
            audience: userId
        }
        jwt.sign({}, process.env.REFRESH_JWT, options, (error, token) => {
            if (error) {
                reject();
            }
            resolve(token);
        });
    });
}

/**
 * hashes a user password
 */
export async function hashPassword(password) {

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
export async function hashCompare(password, hash) {

    try {
        const match = await bcrypt.compare(password, hash);
        return match;
    } catch (error) {
        console.log(error.message);
    }
}

