const { Router } = require('express');
const controller = require('./transferencia.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const { transferenciaSchema } = require('./transferencia.schema');

const router = Router();

router.use(auth);

// POST /api/transferencias — realizar transferência
router.post('/', perm('transferir_crianca'), validate(transferenciaSchema), controller.transferir);

// GET /api/transferencias/crianca/:criancaId — histórico de transferências
router.get('/crianca/:criancaId', perm('gerenciar_criancas'), controller.historico);

module.exports = router;
