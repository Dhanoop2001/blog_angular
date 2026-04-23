'use strict';

const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

const crypto = require('crypto');

function getGmailCredentials() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_PASS?.replace(/\s+/g, '').trim();
  if (user && pass) return { user, pass };
  return null;
}

function smtpTlsConfig() {
  const insecure = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').trim().toLowerCase() === 'false';
  const cfg = { minVersion: 'TLSv1.2' };
  if (insecure) cfg.rejectUnauthorized = false;
  return cfg;
}

function gmailSmtpTls() {
  return { ...smtpTlsConfig(), servername: 'smtp.gmail.com' };
}

function createMailer() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  return nodemailer.createTransporter({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: smtpTlsConfig(),
  });
}

async function sendMailViaGmail(gmailUser, gmailPass, mailOptions) {
  const auth = { user: gmailUser, pass: gmailPass };
  const tls = gmailSmtpTls();
  const variants = [
    { name: '465/SSL', options: { host: 'smtp.gmail.com', port: 465, secure: true, auth, tls } },
    { name: '587/STARTTLS', options: { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth, tls } },
  ];

  let lastErr;
  for (const { name, options } of variants) {
    const transporter = nodemailer.createTransporter(options);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('[forgot-password] Gmail OK via', name, 'messageId=', info.messageId || info.response || '');
      return { sent: true, info };
    } catch (e) {
      lastErr = e;
      console.warn('[forgot-password] Gmail', name, 'failed:', e?.message || e);
    }
  }

  const detail = String(lastErr?.message || 'Gmail SMTP failed').slice(0, 220);
  return { sent: false, error: 'send_failed', detail };
}

async function sendPasswordResetEmailWithSendGrid(toEmail, resetUrl, from, subject) {
  const key = process.env.SENDGRID_API_KEY?.trim();
  if (!key) return null;

  sgMail.setApiKey(key);
  const fromNormalized = from.includes('<') ? from : `"Ecom" <${from.replace(/"/g, '')}>`;

  try {
    await sgMail.send({
      from: fromNormalized,
      to: toEmail,
      subject,
      text: `Reset your password by opening this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Reset your password by clicking below (link expires in 1 hour):</p><p><a href="${resetUrl.replace(/"/g, '"')}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
    });
    return { sent: true, via: 'sendgrid' };
  } catch (e) {
    console.warn('[forgot-password] SendGrid failed:', e?.message || e);
    return null;
  }
}

async function sendPasswordResetEmail(toEmail, resetUrl, req) {
  const from = process.env.MAIL_FROM?.trim() || process.env.GMAIL_USER?.trim() || process.env.SMTP_USER || '"Ecom" <noreply@example.com>';
  const subject = process.env.MAIL_RESET_SUBJECT || 'Reset your password';

  const mailPayload = {
    from,
    to: toEmail,
    subject,
    text: `Reset your password by opening this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Reset your password by clicking below (link expires in 1 hour):</p><p><a href="${resetUrl.replace(/"/g, '"')}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  };

  // Try SendGrid first
  const sg = await sendPasswordResetEmailWithSendGrid(toEmail, resetUrl, from, subject);
  if (sg) {
    console.log('[forgot-password] Email sent via SendGrid');
    return { sent: true, error: null };
  }

  // Gmail
  const gc = getGmailCredentials();
  if (gc) {
    const g = await sendMailViaGmail(gc.user, gc.pass, mailPayload);
    if (g.sent) return { sent: true, error: null };
    return { sent: false, error: 'send_failed', detail: g.detail };
  }

  // Custom SMTP
  const transporter = createMailer();
  if (!transporter) {
    console.warn('[forgot-password] No mail transport configured. Link not emailed:', resetUrl);
    return { sent: false, error: 'smtp_not_configured' };
  }

  try {
    const info = await transporter.sendMail(mailPayload);
    console.log('[forgot-password] Email sent via SMTP');
    return { sent: true, error: null };
  } catch (e) {
    console.error('[forgot-password] SMTP sendMail failed:', e?.message || e);
    return { sent: false, error: 'send_failed', detail: String(e?.message || 'SMTP failed').slice(0, 220) };
  }
}

function resetLinkBaseUrl(req) {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const origin = String(req.get('origin') || req.headers.origin || '').trim();
  if (!origin) return 'http://localhost:4200';

  try {
    const u = new URL(origin);
    if (!/^https?:$/i.test(u.protocol)) return 'http://localhost:4200';
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return `${u.protocol}//${u.host}`.replace(/\/$/, '');
    
    const isNonProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() !== 'production';
    const isPrivateLan = /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (isNonProduction && isPrivateLan) return `${u.protocol}//${u.host}`.replace(/\/$/, '');
  } catch (_) {}

  return 'http://localhost:4200';
}

function forgotDebugEnabled() {
  return String(process.env.FORGOT_PASSWORD_DEBUG || '').trim() === '1';
}

module.exports = {
  sendPasswordResetEmail,
  resetLinkBaseUrl,
  forgotDebugEnabled,
  getGmailCredentials,
  createMailer
};

