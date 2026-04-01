const { z } = require('zod');

const criarRoleSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres.')
    .toUpperCase(),
  fixa: z.boolean().optional().default(false),
});

const atualizarRoleSchema = z.object({
  nome: z.string().min(2).optional(),
});

const atribuirPermissaoSchema = z.object({
  permissaoId: z.string().uuid('ID de permissão inválido.'),
});

module.exports = { criarRoleSchema, atualizarRoleSchema, atribuirPermissaoSchema };
