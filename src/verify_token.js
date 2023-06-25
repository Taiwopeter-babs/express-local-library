#!/usr/bin/node
import jwt from 'jsonwebtoken';
import * as bcrypt from "bcrypt";


const saltRounds = 10;
//age of web token in seconds
export const maxAge = 3 * 24 * 60 * 60;


/**
 * verifies the json web token
 */
export function verifyToken(req, res, next) {
    const { token } = req.body;

    if (!token) {
        return res.status(404).json({ "status": "Not found" });
    }
    try {
        const decodedToken = jwt.verify(token, process.env.JWT)
    } catch (error) { return; }
}


/**
 * creates a json web token
 */
export const createToken = (username) => {

    const secretKey = process.env.JWT;
    return jwt.sign({ "username": username }, secretKey, { expiresIn: maxAge });
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

