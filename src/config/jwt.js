const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente.');
}

const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

const verify = (token) => jwt.verify(token, SECRET);

module.exports = { sign, verify };
