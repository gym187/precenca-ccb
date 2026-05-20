const { Router } = require('express');
const controller = require('./continuacao.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const { criarContinuacaoSchema, atualizarContinuacaoSchema } = require('./continuacao.schema');

const router = Router();

router.use(auth);

router.get('/', controller.listar);
router.get('/todas', perm('gerenciar_continuacoes'), controller.listarTodas);
router.get('/:id', controller.buscar);
router.post('/', perm('gerenciar_continuacoes'), validate(criarContinuacaoSchema), controller.criar);
router.put('/:id', perm('gerenciar_continuacoes'), validate(atualizarContinuacaoSchema), controller.atualizar);
router.delete('/:id', perm('gerenciar_continuacoes'), controller.remover);

module.exports = router;
