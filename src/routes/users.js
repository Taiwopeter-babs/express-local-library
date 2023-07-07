#!/usr/bin/node
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import UserEntity from '../entities/userModel.js';

import { datasource } from '../data_source.js';
import redisClient from '../init_redis.js';

import { hashCompare, hashPassword } from '../tokens_helper.js';
import { createAccessToken, createRefreshToken } from '../tokens_helper.js';
import { ageAccessToken, ageRefreshToken } from '../tokens_helper.js';
import { verifyRefreshToken, verifyToken } from '../tokens_helper.js';


// Declare router for route
const router = express.Router();


/* GET users listing. */
router.get('/', verifyToken, async function (req, res, next) {

  try {
    const usersRepo = datasource.getRepository(UserEntity);
    const users = await usersRepo.find({
      select: {
        first_name: true,
        id: true,
        birthday: true
      }
    });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(404).json({ "status": "Not found" })
  }
});


/* Get single user data */
router.get('/:user_id', verifyToken, async function (req, res, next) {

  const user_id = req.params.user_id;

  try {
    const user = await datasource.getRepository(UserEntity).findOneBy({
      id: user_id
    });
    if (!user) {
      return res.status(404).json({ "status": "Not found", success: false })
    } else {
      return res.status(200).json(user);
    }
  } catch (error) {
    return res.status(408).json({ "status": "Request Timeout", success: false })
  }
})


/* create a new user */
router.post('/signup', async function (req, res, next) {

  const newId = uuidv4();

  try {
    if (!req.is('application/json')) {
      return res.status(406).json({ "status": "content-type not acceptable", success: false });
    }

    const userData = req.body;

    const usersRepo = datasource.getRepository(UserEntity);
    const user = await usersRepo.findOneBy({
      email: userData.email
    })

    // check for existing user
    if (user) {
      return res.status(400).json({ "status": "account already exists", success: false })
    }

    // hash paswword, then assign new Id
    userData.password = await hashPassword(userData.password)
    userData["id"] = newId;
    userData.birthday = new Date(userData.birthday)


    const createdUser = datasource.getRepository(UserEntity).create(userData);
    const newUser = await datasource.getRepository(UserEntity).save(createdUser);

    const [accessToken, refreshToken] =
      await Promise.all(
        [createAccessToken(userData.id),
        createRefreshToken(userData.id)]);
    // send cookies
    res.cookie('jwt', refreshToken,
      { httpOnly: true, secure: true, maxAge: ageRefreshToken * 1000 });

    // delete password from response
    delete user['password'];

    // return response
    return res.status(201).json({ accessToken, user });

  } catch (error) {
    // throw new Error(error);
    res.status(400).json({ success: false });
  }
});


/* User login route */
router.post('/login', async function (req, res, next) {

  try {
    const { email, password } = req.body;

    const usersRepo = datasource.getRepository(UserEntity);
    const user = await usersRepo.findOneBy({
      email: email
    })

    // check for user's validity
    if (!user) {
      return res.status(404).json({ success: false })
    }
    // check valid password
    const passwordMatch = await hashCompare(password, user.password)
    if (!passwordMatch) {
      return res.status(400).json({})
    }
    // On success, create web tokens and send in cookies
    const [accessToken, refreshToken] =
      await Promise.all(
        [createAccessToken(user.id),
        createRefreshToken(user.id)]);

    // send refresh token in cookie
    res.cookie('jwt', refreshToken,
      { httpOnly: true, secure: true, maxAge: ageRefreshToken * 1000 });

    // delete password from response
    delete user['password'];

    // return response
    return res.status(200).json({ accessToken, user });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});



/* Refresh access tokens with the refresh token */
router.post('/refresh-token', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.jwt;
    if (!refreshToken) {
      return res.status(400).json({});
    }
    // verify refresh token
    const userId = await verifyRefreshToken(refreshToken);

    // create new tokens and cache them with user ids 
    const [accessToken, newRefreshToken] =
      await Promise.all(
        [createAccessToken(userId),
        createRefreshToken(userId)]);

    // send refresh token in a cookie and access token in response
    res.cookie('jwt', newRefreshToken,
      { httpOnly: true, secure: true, maxAge: ageRefreshToken * 1000 });

    res.status(200).json({ accessToken })

  } catch (error) {
    res.status(400).json({});
  }
})

/* User logout route */
router.delete('/:userId/logout', async function (req, res, next) {
  try {

    const userId = req.params.userId;
    const refreshToken = req.cookies.jwt;
    const usersRepo = datasource.getRepository(UserEntity);
    const user = await usersRepo.findOneBy({
      id: userId
    })

    // check for user's validity
    if (!user) {
      return res.status(404).json({ success: false })
    }
    // check for refreshToken in cache
    const replyId = await verifyRefreshToken(refreshToken);
    // delete refresh token from cache
    const replyFromRedis = await redisClient.del(replyId);

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ success: false });
  }
});


export default router;
