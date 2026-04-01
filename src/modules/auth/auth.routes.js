const { Router } = require('express');
const controller = require('./auth.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { loginSchema } = require('./auth.schema');

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), controller.login);

// GET /api/auth/me  — retorna dados do usuário autenticado
router.get('/me', auth, controller.me);

module.exports = router;
