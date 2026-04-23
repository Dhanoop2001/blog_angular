'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ObjectId } = require('../db');

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isValidObjectId(idStr) {
  return ObjectId.isValid(idStr);
}

function parseBlogId(idStr) {
  if (isValidObjectId(idStr)) {
    return { _id: new ObjectId(idStr) };
  } else if (!isNaN(Number(idStr))) {
    return { id: Number(idStr) };
  }
  throw new Error('Invalid blog ID format');
}

function generateSafeSlug(titleOrSlug) {
  return String(titleOrSlug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-');
}

module.exports = {
  hashPassword,
  comparePassword,
  hashResetToken,
  generateToken,
  isValidObjectId,
  parseBlogId,
  generateSafeSlug,
  RESET_TTL_MS
};
