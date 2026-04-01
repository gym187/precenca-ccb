const { Router } = require('express');
const controller = require('./crianca.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const {
  criarCriancaSchema,
  atualizarCriancaSchema,
  filtroHistoricoSchema,
} = require('./crianca.schema');

const router = Router();

router.use(auth);

router.get('/', perm('gerenciar_criancas'), controller.listar);
router.get('/:id', perm('gerenciar_criancas'), controller.buscar);
router.get(
  '/:id/historico',
  perm('visualizar_dashboard'),
  validate(filtroHistoricoSchema, 'query'),
  controller.historico
);
router.post('/', perm('gerenciar_criancas'), upload.single('foto'), controller.criar);
router.put('/:id', perm('gerenciar_criancas'), upload.single('foto'), controller.atualizar);
router.delete('/:id', perm('gerenciar_criancas'), controller.remover);

module.exports = router;
