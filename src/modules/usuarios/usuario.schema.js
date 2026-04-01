const { z } = require('zod');

const criarUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  senha: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres.')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula.')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número.'),
});

const atualizarUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  senha: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .optional(),
});

const atribuirRoleSchema = z.object({
  roleId: z.string().uuid('ID de role inválido.'),
});

module.exports = { criarUsuarioSchema, atualizarUsuarioSchema, atribuirRoleSchema };
