const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./auth.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { loginSchema } = require('./auth.schema');

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, validate(loginSchema), controller.login);

// GET /api/auth/me  — retorna dados do usuário autenticado
router.get('/me', auth, controller.me);

module.exports = router;
