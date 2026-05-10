const { z } = require('zod');

const visitaSchema = z.object({
  criancaId:     z.string().uuid('ID da criança inválido.'),
  data:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD.'),
  hora:          z.string().regex(/^\d{2}:\d{2}$/, 'hora deve ser HH:MM.'),
  endereco:      z.string().min(1, 'Endereço obrigatório.'),
  responsavelId: z.string().uuid('ID do responsável inválido.'),
  observacao:    z.string().optional(),
  status:        z.enum(['pendente', 'concluida', 'remarcada']).default('pendente'),
});

const editarVisitaSchema = visitaSchema.partial();

module.exports = { visitaSchema, editarVisitaSchema };
