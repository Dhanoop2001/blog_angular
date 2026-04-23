'use strict';

const userModel = require('../models/user.model');
const { forgotDebugEnabled, resetLinkBaseUrl, sendPasswordResetEmail } = require('../utils/email');
const { hashResetToken, generateToken } = require('../utils/helpers');

async function signup(req, res, usersCol) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await userModel.create(usersCol, { name, email, password });
    res.status(201).json({ id: result.id, message: 'Account created successfully' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function signin(req, res, usersCol, sessionsCol) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await userModel.findByEmail(usersCol, email);
    const { comparePassword } = require('../utils/helpers');
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = await userModel.createSession(sessionsCol, user._id);
    res.json({ token });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function forgotPasswordRequest(req, res, usersCol, resetsCol) {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const dbg = forgotDebugEnabled();
    const user = await userModel.findByEmail(usersCol, normalizedEmail);

    const genericMessage = 'If an account exists for that email, a reset link has been sent.';

    if (!user) {
      console.log('[forgot-password] No user for', normalizedEmail);
      return res.json({
        sent: true,
        message: genericMessage,
        ...(dbg && { _debug: { outcome: 'no_user', emailed: false } })
      });
    }

    const rawToken = generateToken();
    await userModel.createReset(resetsCol, normalizedEmail, rawToken);

    const linkBase = resetLinkBaseUrl(req);
    const resetUrl = `${linkBase}/forgot-password?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalizedEmail)}`;

    const mailResult = await sendPasswordResetEmail(normalizedEmail, resetUrl, req);

    if (!mailResult.sent) {
      await userModel.clearResets(resetsCol, normalizedEmail);
      if (process.env.NODE_ENV !== 'production') {
        return res.json({
          sent: false,
          resetToken: rawToken,
          message: mailResult.error === 'smtp_not_configured' ? 'No SMTP configured (dev). Use token above.' : 'Email failed. Check SMTP.',
          ...(mailResult.detail && { smtpError: mailResult.detail })
        });
      }
      return res.status(503).json({ message: 'Could not send email. Try later.' });
    }

    res.json({
      sent: true,
      message: genericMessage,
      ...(dbg && { _debug: { outcome: 'email_sent', emailed: true } })
    });
  } catch (err) {
    console.error('Forgot password request error:', err);
    res.status(500).json({ message: 'Failed to process request' });
  }
}

async function forgotPasswordReset(req, res, resetsCol, usersCol) {
  try {
    const { email, resetToken, newPassword } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !resetToken || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Email, token, and password (min 8 chars) required' });
    }

    await userModel.verifyResetToken(resetsCol, normalizedEmail, resetToken);
    await userModel.updatePassword(usersCol, normalizedEmail, newPassword);
    await userModel.clearResets(resetsCol, normalizedEmail);

    res.json({ ok: true, message: 'Password reset successfully' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
}

module.exports = {
  signup,
  signin,
  forgotPasswordRequest,
  forgotPasswordReset
};

