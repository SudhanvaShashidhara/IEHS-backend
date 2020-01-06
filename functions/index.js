const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

admin.initializeApp();

const SENDGRID_API_KEY = functions.config().sendgrid.key;
const RECAPTCHA_SECRET_KEY = functions.config().recaptcha.secretkey;
sgMail.setApiKey(SENDGRID_API_KEY);

const app = express();

app.options('*', cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/contact-form', cors(), async (req, res, _) => {
  const reqBody = req.body;
  const { name, email, phone, message } = reqBody;
  const recaptchaClientResponse = reqBody['g-recaptcha-response'];
  try {
    const recaptchaEndPoint = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaClientResponse}&remoteip=${req.connection.remoteAddress}`;
    const recaptchaVerification = await fetch(recaptchaEndPoint);
    const jsonRecaptchaVerification = await recaptchaVerification.json();
    if (jsonRecaptchaVerification.success) {
      const db = admin.firestore();
      try {
        await db.collection('contact-form-submissions').add(reqBody);
        const msg = {
          to: 'sudhanva.shash@gmail.com',
          from: 'contact@iehs.com',
          subject: 'IEHS - New Contact Form Submission',
          html: `<h1>New Contact Form Submitted</h1></br></br></br><ul><li>Name: ${name}</li><li>Email: ${email}</li><li>Phone: ${phone}</li><li>Message: ${message}</li></ul>`
        };
        await sgMail.send(msg);
        return res.json({
          success: true,
          message: 'Form successfully submitted.'
        });
      } catch (err) {
        console.log(err);
        return res.json({
          success: false,
          message: 'Unable to save contact form response.'
        });
      }
    }
  } catch (err) {
    console.log(err);
    return res.json({
      success: false,
      message: 'Unable to verify recaptcha response.'
    });
  }
  return res.json({
    success: false,
    message: 'Server error. Could not save form response.'
  });
});

exports.contactFormEndPoint = functions
  .region('asia-east2')
  .https.onRequest(app);
