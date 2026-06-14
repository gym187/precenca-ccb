const { Router } = require('express');
const controller = require('./crianca.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const {
  criarCriancaSchema,
  atualizarCriancaSchema,
  arquivarCriancaSchema,
  filtroHistoricoSchema,
} = require('./crianca.schema');

const router = Router();

router.use(auth);

router.get('/', perm('gerenciar_criancas'), controller.listar);
router.get('/:id', perm('gerenciar_criancas'), controller.buscar);
router.get(
  '/:id/historico',
  perm('gerenciar_criancas'),
  validate(filtroHistoricoSchema, 'query'),
  controller.historico
);
router.post('/', perm('gerenciar_criancas'), upload.single('foto'), controller.criar);
router.put('/:id', perm('gerenciar_criancas'), upload.single('foto'), controller.atualizar);
router.delete('/:id', perm('gerenciar_criancas'), validate(arquivarCriancaSchema), controller.remover);

// Marca a criança como "contatada" — usado no alerta de faltas consecutivas
// para ocultar até a próxima falta nova. Requer apenas visualizar_dashboard
// (mesma permissão de quem enxerga o alerta).
router.post('/:id/contato', perm('visualizar_dashboard'), controller.marcarContato);

module.exports = router;
