const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

const UserEntity = require('./entities/userModel');
const datasource = require('./data_source');
const redisClient = require('./init_redis');

require('dotenv').config({
  path: '../.env'
});



// Generate secret code for email confirmation
const generateRandom = () => {

  return new Promise((resolve, reject) => {
    let result = '';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charsLength = chars.length;

    let count = 0;

    while (count < 30) {
      result += chars.charAt(Math.floor(Math.random() * charsLength));
      count += 1;
    }
    resolve(result);
  })
}

// define nodemailer transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_ADDR,
    pass: process.env.EMAIL_PASSWORD,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN
  }
});

// options for the html templating engine
const handlebarOptions = {
  viewEngine: {
    partialsDir: path.resolve('./src/views'),
    defaultLayout: false
  },
  viewPath: path.resolve('./src/views/')
}

// use a template file with nodemailer
transporter.use('compile', hbs(handlebarOptions));

// configure mail options

/**
 * send confirmation email to newly registered user
 * and handles caching of the confirmation secret
 * @returns Email response on success, otherwise null
 */
async function sendConfirmationMail(userEmail) {

  try {
    const secret = await generateRandom();

    const mailOptions = {
      from: process.env.EMAIL_ADDR,
      to: userEmail,
      subject: 'Email Confirmation',
      template: 'email',
      context: {
        name: "first_user",
        link: `${process.env.EMAIL_VERIFY_LINK}/${userEmail}/${secret}`
      }
    }
    // send email to user and cache the secret key
    const mailSentResponse = await transporter.sendMail(mailOptions);
    console.log(`confirmation mail sent!: ${mailSentResponse.response}`);
    if (mailSentResponse) {
      cacheResponse = cacheVerificationEmailToken(userEmail, secret);
      if (cacheResponse) {
        return mailSentResponse;
      }
    } else {
      throw new Error('An error occured. Confimation mail not sent');
    }

  } catch (error) {
    console.log(error.message);
    return null;
  }
}

// sendConfirmationMail('babalolataiwop@gmail.com');

/**
 * cache token for limited time for user to confirm email
 * @param {*} userEmail - user's email
 * @param {*} tokenToVerify - token for verification
 * @returns true on success, otherwise false
 */
async function cacheVerificationEmailToken(userEmail, tokenToVerify) {
  // check for complete parameters
  if (!userEmail || !tokenToVerify) {
    return false;
  }

  try {
    const reply = await redisClient.set(userEmail, tokenToVerify, {
      EX: 600, // 10 mins
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
 * Gets a user from the database
 * @param {*} userEmail - user's email address
 */
const findUser = async (userEmail) => {
  const user = await datasource.getRepository(UserEntity).findOneBy({
    email: userEmail
  });
  return user;
}

/**
 * A middleware to check user's email confirmation status
 * @param {*} req - request object
 * @param {*} res - response object
 * @param {*} next - goes to the next middleware function
 * @returns - Only returns errors
 */
async function verifyConfirmedUser(req, res, next) {

  try {
    const userEmail = req.body.email;
    user = await findUser(userEmail);

    // check user's email validity
    if (!user) {
      return res.status(404).json({ message: "Not found" })
    }
    console.log(user.valid_email);
    if (!(user.valid_email)) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

  } catch (error) {
    return res.status(400).json({ error: "Bad Request" });
  }
  // go to the next middleware or route
  next();
}


module.exports = {
  sendConfirmationMail,
  verifyConfirmedUser
}