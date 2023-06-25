#!/usr/bin/node
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import UserEntity from '../entities/userModel.js';
import { datasource } from '../data_source.js';
import { createToken, verifyToken, maxAge, hashCompare, hashPassword } from '../verify_token.js';


// Declare router for route
const router = express.Router();


/* GET users listing. */
router.get('/', async function (req, res, next) {

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
router.get('/:user_id', async function (req, res, next) {

  const user_id = req.params.user_id;

  try {
    const user = await datasource.getRepository(UserEntity).findOneBy({
      id: user_id
    });
    if (!user) {
      return res.status(404).json({ "status": "Not found" })
    } else {
      return res.status(200).json(user);
    }
  } catch (error) {
    return res.status(408).json({ "status": "Request Timeout" })
  }
})


/* create a new user */
router.post('/signup', async function (req, res, next) {

  const newId = uuidv4();

  try {
    if (!req.is('application/json')) {
      return res.status(406).json({ "status": "content-type not acceptable" });
    }

    const userData = req.body;

    const usersRepo = datasource.getRepository(UserEntity);
    const user = await usersRepo.findOneBy({
      email: userData.email
    })

    // check for existing user
    if (user) {
      return res.status(400).json({ "status": "account exists" })
    }

    // hash paswword, then assign new Id
    userData.password = await hashPassword(userData.password)
    userData["id"] = newId;
    userData.birthday = new Date(userData.birthday)


    const createdUser = datasource.getRepository(UserEntity).create(userData);
    const newUser = await datasource.getRepository(UserEntity).save(createdUser);
    const token = createToken(userData.username)

    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })

    return res.status(201).json(newUser.id);
  } catch (error) {
    console.log(error);
    throw new Error(error);
    res.status(400).json({ "status": "Incomplete request" })
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
      return res.status(404).json({ "status": "Not found" })
    }
    // check valid password
    const passwordMatch = await hashCompare(password, user.password)
    if (!passwordMatch) {
      return res.status(400).json({})
    }
    // success
    return res.status(200).json({ id: user.id });
  } catch (error) {
    console.log(error);
  }
})

export default router;
