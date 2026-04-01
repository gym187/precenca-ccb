const { Router } = require('express');
const controller = require('./presenca.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const { lancamentoListaSchema, editarPresencaSchema } = require('./presenca.schema');

const router = Router();

router.use(auth);

// POST /api/presencas/lista — lançamento em checklist
router.post(
  '/lista',
  perm('lancar_presenca'),
  validate(lancamentoListaSchema),
  controller.lancarLista
);

// GET /api/presencas — listar com filtros
router.get('/', perm('lancar_presenca'), controller.listar);

// PUT /api/presencas/:id — editar presença individual
router.put(
  '/:id',
  perm('editar_presenca'),
  validate(editarPresencaSchema),
  controller.editar
);

// GET /api/presencas/:id/auditoria — histórico de alterações
router.get('/:id/auditoria', perm('editar_presenca'), controller.auditoria);

module.exports = router;
