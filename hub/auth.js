const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const store = require('./store');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_COOKIE = 'myrack_session';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function createSession(username) {
  const session = {
    token: nanoid(40),
    username,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  store.createSession(session);
  return session;
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    // Not marking `secure: true` here on purpose: most MyRack installs run over
    // plain http on a LAN. If you expose this past your LAN, put it behind a
    // reverse proxy with TLS rather than relying on this cookie alone.
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE);
}

function getSessionFromRequest(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  return store.getSession(token);
}

module.exports = {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
};
