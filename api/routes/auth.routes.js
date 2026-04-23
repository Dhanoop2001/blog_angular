'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const router = express.Router();

router.post('/signup', (req, res, next) => authController.signup(req, res, res.locals.usersCol));
router.post('/signin', (req, res, next) => authController.signin(req, res, res.locals.usersCol, res.locals.sessionsCol));
router.post('/forgot-password/request', (req, res, next) => authController.forgotPasswordRequest(req, res, res.locals.usersCol, res.locals.resetsCol));
router.post('/forgot-password/reset', (req, res, next) => authController.forgotPasswordReset(req, res, res.locals.resetsCol, res.locals.usersCol));

module.exports = router;

