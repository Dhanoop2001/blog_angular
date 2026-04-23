'use strict';

const { ObjectId } = require('../db');
const { hashPassword, comparePassword, generateToken } = require('../utils/helpers');

async function findByEmail(usersCol, email) {
  return usersCol.findOne({ email: email.toLowerCase() });
}

async function create(usersCol, { name, email, password }) {
  const existing = await findByEmail(usersCol, email);
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  const passwordHash = hashPassword(password);
  const result = await usersCol.insertOne({
    name: name?.trim() || '',
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date()
  });

  return { id: result.insertedId };
}

async function createSession(sessionsCol, userId) {
  const token = generateToken();
  await sessionsCol.insertOne({
    token,
    userId,
    createdAt: new Date()
  });
  return token;
}

async function verifyResetToken(resetsCol, email, resetToken) {
  const tokenHash = require('../utils/helpers').hashResetToken(resetToken);
  const record = await resetsCol.findOne({ email: email.toLowerCase(), tokenHash });
  if (!record || record.expiresAt < new Date()) {
    const err = new Error('Invalid or expired reset link');
    err.status = 400;
    throw err;
  }
  return record;
}

async function clearResets(resetsCol, email) {
  await resetsCol.deleteMany({ email: email.toLowerCase() });
}

async function createReset(resetsCol, email, rawToken) {
  const tokenHash = require('../utils/helpers').hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + require('../utils/helpers').RESET_TTL_MS);
  await resetsCol.deleteMany({ email: email.toLowerCase() });
  await resetsCol.insertOne({
    email: email.toLowerCase(),
    tokenHash,
    expiresAt,
    createdAt: new Date()
  });
}

async function updatePassword(usersCol, email, newPassword) {
  const newHash = hashPassword(newPassword);
  const result = await usersCol.updateOne(
    { email: email.toLowerCase() },
    { $set: { passwordHash: newHash } }
  );
  if (result.matchedCount === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return { ok: true };
}

module.exports = {
  findByEmail,
  create,
  createSession,
  verifyResetToken,
  clearResets,
  createReset,
  updatePassword
};

