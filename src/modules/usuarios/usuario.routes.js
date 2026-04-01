const { Router } = require('express');
const controller = require('./usuario.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const { criarUsuarioSchema, atualizarUsuarioSchema, atribuirRoleSchema } = require('./usuario.schema');

const router = Router();

router.use(auth);

router.get('/', perm('gerenciar_usuarios'), controller.listar);
router.get('/:id', perm('gerenciar_usuarios'), controller.buscar);
router.post('/', perm('gerenciar_usuarios'), validate(criarUsuarioSchema), controller.criar);
router.put('/:id', perm('gerenciar_usuarios'), validate(atualizarUsuarioSchema), controller.atualizar);
router.delete('/:id', perm('gerenciar_usuarios'), controller.remover);

// Gerenciamento de roles do usuário
router.post('/:id/roles', perm('gerenciar_usuarios'), validate(atribuirRoleSchema), controller.atribuirRole);
router.delete('/:id/roles/:roleId', perm('gerenciar_usuarios'), controller.removerRole);

// Gerenciamento de continuações do usuário
router.get('/:id/continuacoes', perm('gerenciar_usuarios'), controller.listarContinuacoes);
router.post('/:id/continuacoes', perm('gerenciar_usuarios'), controller.atribuirContinuacao);
router.delete('/:id/continuacoes/:continuacaoId', perm('gerenciar_usuarios'), controller.removerContinuacao);

module.exports = router;
