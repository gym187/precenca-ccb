const { z } = require('zod');

const STATUS_VALIDOS = ['presente', 'ausente', 'justificado'];

const itemListaSchema = z.object({
  criancaId: z.string().uuid('criancaId inválido.'),
  status: z.enum(STATUS_VALIDOS, {
    errorMap: () => ({ message: 'Status deve ser: presente, ausente ou justificado.' }),
  }),
});

const lancamentoListaSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD.'),
  tipoReuniao: z.string().default('reuniao_jovens'),
  presencas: z.array(itemListaSchema).min(1, 'Informe ao menos uma criança.'),
});

const editarPresencaSchema = z.object({
  status: z.enum(STATUS_VALIDOS, {
    errorMap: () => ({ message: 'Status deve ser: presente, ausente ou justificado.' }),
  }),
  motivo: z.string().optional(),
});

module.exports = { lancamentoListaSchema, editarPresencaSchema };
