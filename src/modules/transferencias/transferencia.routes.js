const { Router } = require('express');
const controller = require('./transferencia.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const AppError = require('../../utils/AppError');
const { transferenciaSchema } = require('./transferencia.schema');

const router = Router();

router.use(auth);

const somenteAdmin = (req, _res, next) => {
  if (!req.usuario?.isAdminGeral) {
    return next(new AppError('Apenas administradores podem realizar transferências.', 403));
  }
  next();
};

// POST /api/transferencias — realizar transferência (somente ADMIN_GERAL)
router.post('/', somenteAdmin, validate(transferenciaSchema), controller.transferir);

// GET /api/transferencias/crianca/:criancaId — histórico de transferências
router.get('/crianca/:criancaId', perm('transferir_crianca'), controller.historico);

module.exports = router;
