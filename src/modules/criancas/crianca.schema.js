const { z } = require('zod');

const MOTIVOS_ARQUIVAMENTO = ['casamento', 'transferencia_outra_congregacao', 'falecimento', 'outros'];

const criarCriancaSchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome deve ter ao menos 3 caracteres.'),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD.'),
  foto: z.string().min(1, 'Foto é obrigatória.'),
  nomeResponsavel: z.string().min(3, 'Nome do responsável obrigatório.'),
  telefoneResponsavel: z.string().min(8, 'Telefone do responsável obrigatório.'),
  telefoneCrianca: z.string().optional(),
  descricao: z.string().optional(),
  observacao: z.string().optional(),
  continuacaoId: z.string().uuid('ID de continuação inválido.'),
});

const atualizarCriancaSchema = z.object({
  nomeCompleto: z.string().min(3).optional(),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  foto: z.string().min(1, 'Foto não pode ser vazia.').optional(),
  nomeResponsavel: z.string().min(3).optional(),
  telefoneResponsavel: z.string().min(8).optional(),
  telefoneCrianca: z.string().optional(),
  descricao: z.string().optional(),
  observacao: z.string().optional(),
  continuacaoId: z.string().uuid().optional(),
  ativo: z.boolean().optional(),
});

const arquivarCriancaSchema = z
  .object({
    motivo: z.enum(MOTIVOS_ARQUIVAMENTO, {
      errorMap: () => ({ message: 'Motivo inválido.' }),
    }),
    observacao: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.motivo === 'outros' && (!val.observacao || val.observacao.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['observacao'],
        message: 'Observação é obrigatória quando o motivo é "outros".',
      });
    }
  });

const filtroHistoricoSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  trimestre: z.enum(['1', '2', '3', '4']).optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodo: z.enum(['1m', '3m', '6m', '12m', 'all']).optional(),
  status: z.enum(['presente', 'ausente', 'justificado']).optional(),
});

module.exports = {
  criarCriancaSchema,
  atualizarCriancaSchema,
  arquivarCriancaSchema,
  filtroHistoricoSchema,
  MOTIVOS_ARQUIVAMENTO,
};
