const { checkCacheForToken } = require('../cache_data');

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const UserEntity = require('../entities/userModel');

const datasource = require('../data_source');
const redisClient = require('../init_redis');

const { hashCompare, hashPassword } = require('../tokens_helper');
const { createAccessToken, createRefreshToken } = require('../tokens_helper');
const { ageAccessToken, ageRefreshToken } = require('../tokens_helper');
const { verifyRefreshToken, verifyToken } = require('../tokens_helper');
const { sendConfirmationMail, verifyConfirmedUser } = require('../email_confirmation');


// Declare router for route
const router = express.Router();


/* GET users listing. */
router.get('/', verifyToken, verifyConfirmedUser, async function (req, res, next) {

  try {
    const usersRepo = datasource.getRepository(UserEntity);
    const users = await usersRepo.find({
      select: {
        first_name: true,
        id: true,
        birthday: true,
        valid_email: true
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
      return res.status(404).json({ message: "User Not found" })
    }
    return res.status(200).json(user);

  } catch (error) {
    return res.status(408).json({ error: "Request Timeout" })
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
      return res.status(400).json({ "message": "account already exists" })
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
    delete newUser['password'];

    // send verification email and return response
    const mailSent = sendConfirmationMail(newUser.email);

    if (!mailSent) {
      return res.status(401).json({ message: 'Unsuccessful registration' });
    }
    return res.status(201).json({
      message: 'registration successful',
      accessToken,
      newUser
    });

  } catch (error) {
    // throw new Error(error);
    console.log(error);
    res.status(401).json({ error: 'Unexpected error. Please try again later' });
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
      return res.status(400).json({ message: 'No refresh token' });
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
    res.status(400).json({ error: 'Generating new access token failed.' });
  }
})

/* User Email confimation route */
router.post('/activation/:userEmail/:secretCode', async function (req, res, next) {
  try {

    const { userEmail, secretCode } = req.params;
    const usersRepo = datasource.getRepository(UserEntity);
    const user = await usersRepo.findOneBy({
      email: userEmail
    })

    // check for user's validity
    if (!user) {
      return res.status(404).json({ message: 'Not found' })
    }

    // check confimation secret key
    const secretKey = await checkCacheForToken(userEmail);
    if (!(secretKey === secretCode)) {
      return res.status(400).json({ message: 'Email confirmaton unsuccessful' });
    }
    user.valid_email = true;
    await usersRepo.save(user);
    const replyFromRedis = await redisClient.del(userEmail);
    if (replyFromRedis) {
      return res.status(200).json({ message: 'Email Confirmed' });
    }



  } catch (error) {
    return res.status(401).json({ error: 'Unexpected email error. Please try again later' });
  }
});

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


module.exports = router;
