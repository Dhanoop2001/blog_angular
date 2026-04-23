const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const { readFileSync } = require('fs');
const { connect, ObjectId } = require('./db');
const blogsRoutes = require('./routes/blogs.routes');
const authRoutes = require('./routes/auth.routes');
const { upload: multerUpload } = require('./utils/upload');

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));



let collections = null;

function getGmailCredentials() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_PASS?.replace(/\s+/g, '').trim();
  if (user && pass) return { user, pass };
  return null;
}


function smtpTlsConfig() {
  const insecure =
    String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').trim().toLowerCase() === 'false';
  const cfg = { minVersion: 'TLSv1.2' };
  if (insecure) cfg.rejectUnauthorized = false;
  return cfg;
}

function gmailSmtpTls() {
  return { ...smtpTlsConfig(), servername: 'smtp.gmail.com' };
}

function createMailer() {
  if (getGmailCredentials()) {
    return null;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  return nodemailer.createTransport({
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
    {
      name: '587/STARTTLS',
      options: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth,
        tls,
      },
    },
  ];

  let lastErr;
  for (const { name, options } of variants) {
    const transporter = nodemailer.createTransport(options);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('[forgot-password] Gmail OK via', name, 'messageId=', info.messageId || info.response || '');
      return { sent: true, info };
    } catch (e) {
      lastErr = e;
      const rc = e?.responseCode || e?.response?.substring?.(0, 120);
      console.warn('[forgot-password] Gmail', name, 'failed:', e?.message || e, rc || '');
    }
  }

  const code = lastErr?.responseCode || lastErr?.code;
  console.error('[forgot-password] Gmail both SMTP ports failed.', code ? `last code=${code}` : '', lastErr?.message || lastErr);
  if (String(lastErr?.message || '').includes('Invalid login') || code === 535 || code === 'EAUTH') {
    console.error(
      '[forgot-password] Use a Google App Password (16 chars, no spaces): Account → Security → 2-Step Verification → App passwords.'
    );
  }
  const detail = String(lastErr?.message || 'Gmail SMTP failed').slice(0, 220);
  return { sent: false, error: 'send_failed', detail };
}

function isNonProduction() {
  return String(process.env.NODE_ENV || '').trim().toLowerCase() !== 'production';
}

function isPrivateLanHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h);
}


 
function resetLinkBaseUrl(req) {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const origin = String(req.get('origin') || req.headers.origin || '').trim();
  if (!origin) {
    return 'http://localhost:4200';
  }

  try {
    const u = new URL(origin);
    if (!/^https?:$/i.test(u.protocol)) {
      return 'http://localhost:4200';
    }
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${u.protocol}//${u.host}`.replace(/\/$/, '');
    }
    if (isNonProduction() && isPrivateLanHost(host)) {
      return `${u.protocol}//${u.host}`.replace(/\/$/, '');
    }
  } catch (_) {
  }

  return 'http://localhost:4200';
}

function forgotDebugEnabled() {
  return String(process.env.FORGOT_PASSWORD_DEBUG || '').trim() === '1';
}

async function sendPasswordResetEmailWithSendGrid(toEmail, resetUrl, from, subject) {
  const key = process.env.SENDGRID_API_KEY?.trim();
  if (!key) return null;

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(key);
  const fromNormalized =
    from.includes('<') ? from : `"Ecom" <${from.replace(/"/g, '')}>`;

  await sgMail.send({
    from: fromNormalized,
    to: toEmail,
    subject,
    text: `Reset your password by opening this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Reset your password by clicking below (link expires in 1 hour):</p><p><a href="${resetUrl.replace(/"/g, '&quot;')}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
  return { sent: true, via: 'sendgrid' };
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const from =
    (process.env.MAIL_FROM && String(process.env.MAIL_FROM).trim()) ||
    process.env.GMAIL_USER?.trim() ||
    process.env.SMTP_USER ||
    '"Ecom" <noreply@example.com>';

  const subject = process.env.MAIL_RESET_SUBJECT || 'Reset your password';

  try {
    const sg = await sendPasswordResetEmailWithSendGrid(toEmail, resetUrl, from, subject);
    if (sg) {
      console.log('[forgot-password] Email sent via SendGrid');
      return { sent: true, error: null };
    }
  } catch (e) {
    console.warn(
      '[forgot-password] SendGrid failed (will try Gmail/SMTP if configured):',
      e?.message || e,
      e?.response?.body || ''
    );
  }

  const gc = getGmailCredentials();
  const mailPayload = {
    from,
    to: toEmail,
    subject,
    text: `Reset your password by opening this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Reset your password by clicking below (link expires in 1 hour):</p><p><a href="${resetUrl.replace(/"/g, '&quot;')}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  };

  if (gc) {
    const g = await sendMailViaGmail(gc.user, gc.pass, mailPayload);
    if (g.sent) return { sent: true, error: null };
    return { sent: false, error: 'send_failed', detail: g.detail };
  }

  const transporter = createMailer();
  if (!transporter) {
    console.warn(
      '[forgot-password] No mail transport (set SENDGRID_API_KEY or GMAIL_USER+GMAIL_PASS or SMTP_*). Link not emailed:',
      resetUrl
    );
    return { sent: false, error: 'smtp_not_configured' };
  }

  try {
    const info = await transporter.sendMail(mailPayload);
    console.log('[forgot-password] Email handed off to SMTP, messageId=', info.messageId || info.response || 'ok');
    return { sent: true, error: null };
  } catch (e) {
    const code = e?.responseCode || e?.code;
    console.error('[forgot-password] sendMail failed:', e?.message || e, code ? `code=${code}` : '');
    return {
      sent: false,
      error: 'send_failed',
      detail: String(e?.message || 'SMTP failed').slice(0, 220),
    };
  }
}


app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await blogsCol.find({}).sort({ createdAt: -1 }).toArray();
    
    const normalizedBlogs = blogs.map(blog => ({
      ...blog,
      _id: blog._id?.toString(),
      id: blog._id?.toString() || blog.id
    }));

    res.json(normalizedBlogs);
  } catch (err) {
    console.error('Get blogs error:', err);
    res.status(500).json({ message: 'Failed to fetch blogs' });
  }
});

app.post('/api/blogs', upload.single('image'), async (req, res) => {
  const { title, content, author, status, slug } = req.body || {};

  if (!title || !content || !author) {
    return res.status(400).json({ message: 'Title, content and author are required' });
  }

  const safeSlug = slug 
    ? String(slug).trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-')
    : String(title).trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-');

  const blog = {
    title: String(title).trim(),
    content: String(content).trim(),
    author: String(author).trim(),
    status: status === 'Draft' ? 'Draft' : 'Publish',
    slug: safeSlug,
    image: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await blogsCol.insertOne(blog);
    res.status(201).json({ 
      ...blog, 
      _id: result.insertedId.toString(),
      id: result.insertedId.toString()
    });
  } catch (err) {
    console.error('Create blog error:', err);
    res.status(500).json({ message: 'Failed to create blog' });
  }
});

app.put('/api/blogs/:id', upload.single('image'), updateBlog);
app.patch('/api/blogs/:id', upload.single('image'), updateBlog);

async function updateBlog(req, res) {
  const { id } = req.params;
  const { title, content, author, status, slug } = req.body || {};

  if (!title || !content || !author) {
    return res.status(400).json({ message: 'Title, content and author are required' });
  }

  const safeSlug = slug 
    ? String(slug).trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-')
    : String(title).trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-');

  const updates = {
    title: String(title).trim(),
    content: String(content).trim(),
    author: String(author).trim(),
    status: status === 'Draft' ? 'Draft' : 'Publish',
    slug: safeSlug,
    updatedAt: new Date().toISOString(),
  };

  if (req.file) {
    updates.image = `/uploads/${req.file.filename}`;
  }

  try {
    let query = {};

    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else if (!isNaN(Number(id))) {
      query = { id: Number(id) };
    } else {
      return res.status(400).json({ message: 'Invalid blog ID format' });
    }

    const result = await blogsCol.updateOne(query, { $set: updates });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const updatedBlog = await blogsCol.findOne(query);
    res.json({
      ...updatedBlog,
      _id: updatedBlog._id?.toString(),
      id: updatedBlog._id?.toString() || updatedBlog.id
    });
  } catch (err) {
    console.error('Update blog error:', err);
    res.status(500).json({ message: 'Failed to update blog' });
  }
}

// Delete blog
app.delete('/api/blogs/:id', async (req, res) => {
  const { id } = req.params;

  try {
    let query = {};

    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else if (!isNaN(Number(id))) {
      query = { id: Number(id) };
    } else {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }

    const result = await blogsCol.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    console.error('Delete blog error:', err);
    res.status(500).json({ message: 'Failed to delete blog' });
  }
});



app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const existingUser = await usersCol.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = hashPassword(password);

    const result = await usersCol.insertOne({
      name: name?.trim() || '',
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date()
    });

    res.status(201).json({ 
      id: result.insertedId,
      message: 'Account created successfully' 
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await usersCol.findOne({ email: email.toLowerCase() });

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    await sessionsCol.insertOne({
      token,
      userId: user._id,
      createdAt: new Date()
    });

    res.json({ token });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Forgot Password & Reset Password
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

app.post('/api/forgot-password/request', async (req, res) => {
  const { email } = req.body || {};
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalized) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const dbg = forgotDebugEnabled();

  try {
    const user = await usersCol.findOne({ email: normalized });

    const genericMessage = 'If an account exists for that email, a reset link has been sent.';

    if (!user) {
      console.log(
        '\n========== FORGOT PASSWORD ==========\n',
        'Email:', normalized,
        '\nUser found in database: NO — no email is sent (this is normal if you never signed up with this address).\n',
        'Watch THIS terminal (Node API), not only the browser Network tab.\n',
        'Add FORGOT_PASSWORD_DEBUG=1 to .env to see details in the JSON response.\n',
        '=======================================\n'
      );
      return res.json({
        sent: true,
        message: genericMessage,
        ...(dbg && {
          _debug: {
            outcome: 'no_user_registered',
            emailed: false,
            hint: 'No row in "users" for this email. Sign up first or use the same email as signup.',
          },
        }),
      });
    }

    const linkBase = resetLinkBaseUrl(req);
    console.log('[forgot-password] User found for', normalized, '— sending mail; link base:', linkBase);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await resetsCol.deleteMany({ email: normalized });
    await resetsCol.insertOne({
      email: normalized,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });

    const resetUrl = `${linkBase}/forgot-password?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalized)}`;

    const mailResult = await sendPasswordResetEmail(normalized, resetUrl);

    if (!mailResult.sent && process.env.NODE_ENV !== 'production') {
      console.log(
        '[forgot-password] Mail not sent (dev). Open THIS terminal above for SMTP / SendGrid logs. resetUrl:',
        resetUrl
      );
      return res.json({
        sent: false,
        resetToken: rawToken,
        message:
          mailResult.error === 'smtp_not_configured'
            ? 'Email is not configured on the server. Use the reset form below (dev only).'
            : 'Email failed to send. Use the reset form below (dev only) or check SMTP settings.',
        ...(mailResult.detail && { smtpError: mailResult.detail }),
        ...(dbg && {
          _debug: {
            outcome: mailResult.error === 'smtp_not_configured' ? 'smtp_not_configured' : 'send_failed',
            emailed: false,
            resetUrl,
            smtpError: mailResult.detail || undefined,
          },
        }),
      });
    }

    if (!mailResult.sent) {
      await resetsCol.deleteMany({ email: normalized });
      return res.status(503).json({
        message:
          'Password reset email could not be sent. Try again later or contact support if the problem continues.',
        ...(dbg && { _debug: { outcome: 'send_failed_prod', emailed: false } }),
      });
    }

    console.log('[forgot-password] Server accepted outbound mail for', normalized, '(check inbox/spam).');

    return res.json({
      sent: true,
      message: genericMessage,
      ...(dbg && { _debug: { outcome: 'email_queued', emailed: true } }),
    });
  } catch (err) {
    console.error('Forgot-password request error:', err);
    return res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

app.post('/api/forgot-password/reset', async (req, res) => {
  const { email, resetToken, newPassword } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const token = typeof resetToken === 'string' ? resetToken.trim() : '';

  if (!normalizedEmail || !token || !newPassword) {
    return res.status(400).json({ message: 'Email, reset token, and new password are required' });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    const tokenHash = hashResetToken(token);
    const record = await resetsCol.findOne({ email: normalizedEmail, tokenHash });

    if (!record || !record.expiresAt || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    const newHash = hashPassword(String(newPassword));
    const updateResult = await usersCol.updateOne(
      { email: normalizedEmail },
      { $set: { passwordHash: newHash } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await resetsCol.deleteMany({ email: normalizedEmail });

    return res.json({ ok: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Forgot-password reset error:', err);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB || 'ecom';

(async function startServer() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    usersCol = db.collection('users');
    sessionsCol = db.collection('sessions');
    resetsCol = db.collection('passwordResets');
    blogsCol = db.collection('blogs');

    const envPath = path.join(__dirname, '..', '.env');
    const mailConfigured =
      !!process.env.SENDGRID_API_KEY?.trim() ||
      !!getGmailCredentials() ||
      !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    if (mailConfigured) {
      console.log('Password-reset email: env OK (from', envPath + ')');
      console.log(
        '   Using:',
        process.env.SENDGRID_API_KEY ? 'SendGrid (then Gmail/SMTP if SendGrid fails)' : getGmailCredentials() ? 'Gmail SMTP' : 'custom SMTP'
      );
    } else {
      console.warn(' Password-reset email: no SENDGRID_API_KEY / GMAIL_* / SMTP_* in', envPath);
    }
    if (forgotDebugEnabled()) {
      console.log(' FORGOT_PASSWORD_DEBUG=1 — API will include _debug in forgot-password responses (turn off in production).');
    } else {
      console.log('  Forgot password logs: watch this window when you click Send. Set FORGOT_PASSWORD_DEBUG=1 for JSON hints.');
    }
    if (String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').trim().toLowerCase() === 'false') {
      console.warn(
        ' SMTP_TLS_REJECT_UNAUTHORIZED=false — TLS certificate checks disabled for SMTP (fixes antivirus/proxy MITM). Prefer fixing trust store / corporate CA for production.'
      );
    }
    if (process.env.PUBLIC_APP_URL?.trim()) {
      console.log('PUBLIC_APP_URL set — reset emails will use:', process.env.PUBLIC_APP_URL.trim().replace(/\/$/, ''));
    } else if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      console.warn(' Set PUBLIC_APP_URL in production so reset links are not stuck on localhost.');
    } else {
      console.log('Reset email links use the browser Origin when safe (localhost / LAN). Or set PUBLIC_APP_URL in .env.');
    }

    const existingCount = await blogsCol.countDocuments({});
    if (existingCount === 0) {
      try {
        const blogsPath = path.join(__dirname, '..', 'src', 'api', 'blogs.json');
        const jsonBlogs = JSON.parse(readFileSync(blogsPath, 'utf8'));
        if (jsonBlogs && jsonBlogs.length > 0) {
          await blogsCol.insertMany(jsonBlogs);
          console.log(` Migrated ${jsonBlogs.length} blogs from JSON`);
        }
      } catch (e) {
        console.warn('Migration skipped or blogs.json not found');
      }
    }

    await blogsCol.createIndex({ createdAt: -1 });
    await blogsCol.createIndex({ _id: 1 });
    await resetsCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(`Frontend should connect to http://localhost:4200`);
    });
  } catch (err) {
    console.error(' Failed to start server:', err);
    process.exit(1);
  }
})();