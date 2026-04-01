const { Router } = require('express');
const controller = require('./permissao.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const { criarPermissaoSchema } = require('./permissao.schema');

const router = Router();

router.use(auth);

router.get('/', perm('gerenciar_permissoes'), controller.listar);
router.post('/', perm('gerenciar_permissoes'), validate(criarPermissaoSchema), controller.criar);
router.delete('/:id', perm('gerenciar_permissoes'), controller.remover);

module.exports = router;
