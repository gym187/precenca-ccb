const { z } = require('zod');

const criarPermissaoSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres.')
    .toLowerCase()
    .regex(/^[a-z_]+$/, 'Nome deve conter apenas letras minúsculas e underscores.'),
});

module.exports = { criarPermissaoSchema };
