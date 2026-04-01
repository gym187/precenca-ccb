const { Router } = require('express');
const controller = require('./role.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const { criarRoleSchema, atualizarRoleSchema, atribuirPermissaoSchema } = require('./role.schema');

const router = Router();

router.use(auth);

router.get('/', perm('gerenciar_roles'), controller.listar);
router.get('/:id', perm('gerenciar_roles'), controller.buscar);
router.post('/', perm('gerenciar_roles'), validate(criarRoleSchema), controller.criar);
router.put('/:id', perm('gerenciar_roles'), validate(atualizarRoleSchema), controller.atualizar);
router.delete('/:id', perm('gerenciar_roles'), controller.remover);

// Permissões da role
router.post('/:id/permissoes', perm('gerenciar_roles'), validate(atribuirPermissaoSchema), controller.atribuirPermissao);
router.delete('/:id/permissoes/:permissaoId', perm('gerenciar_roles'), controller.removerPermissao);

module.exports = router;
