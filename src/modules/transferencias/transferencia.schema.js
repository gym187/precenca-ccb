const { z } = require('zod');

const transferenciaSchema = z.object({
  criancaId: z.string().uuid('ID da criança inválido.'),
  continuacaoDestinoId: z.string().uuid('ID da continuação destino inválido.'),
  dataTransferencia: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataTransferencia deve ser YYYY-MM-DD.')
    .optional(),
});

module.exports = { transferenciaSchema };
