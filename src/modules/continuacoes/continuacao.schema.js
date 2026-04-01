const { z } = require('zod');

const criarContinuacaoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  descricao: z.string().optional(),
  auxiliarIds: z.array(z.string().uuid()).optional(),
});

const atualizarContinuacaoSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  auxiliarIds: z.array(z.string().uuid()).optional(),
});

module.exports = { criarContinuacaoSchema, atualizarContinuacaoSchema };
