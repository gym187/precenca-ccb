const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const INCLUDE = {
  crianca: {
    select: {
      id: true,
      nomeCompleto: true,
      continuacao: { select: { id: true, nome: true } },
    },
  },
  responsavel: { select: { id: true, nome: true } },
};

const listar = async ({ status, criancaId, continuacaoId, dataInicio, dataFim } = {}) => {
  const where = {};
  if (status) where.status = status;
  if (criancaId) where.criancaId = criancaId;
  if (continuacaoId) where.crianca = { continuacaoId };
  if (dataInicio && dataFim)
    where.data = { gte: new Date(dataInicio), lte: new Date(dataFim) };

  return prisma.visita.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ data: 'desc' }, { hora: 'desc' }],
  });
};

const resumo = async () => {
  const [total, porStatus, gruposPorCrianca] = await Promise.all([
    prisma.visita.count(),
    prisma.visita.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.visita.groupBy({ by: ['criancaId'], _count: { id: true } }),
  ]);

  const porStatusMap = { pendente: 0, concluida: 0, remarcada: 0 };
  for (const s of porStatus) porStatusMap[s.status] = s._count.id;

  const criancaIds = gruposPorCrianca.map((g) => g.criancaId);
  const criancas = await prisma.crianca.findMany({
    where: { id: { in: criancaIds } },
    select: { id: true, continuacao: { select: { id: true, nome: true } } },
  });
  const criancaMap = Object.fromEntries(criancas.map((c) => [c.id, c]));

  const contMap = {};
  for (const g of gruposPorCrianca) {
    const cont = criancaMap[g.criancaId]?.continuacao;
    if (!cont) continue;
    if (!contMap[cont.id]) contMap[cont.id] = { continuacaoId: cont.id, nome: cont.nome, total: 0 };
    contMap[cont.id].total += g._count.id;
  }

  return {
    total,
    porStatus: porStatusMap,
    porContinuacao: Object.values(contMap).sort((a, b) => b.total - a.total),
  };
};

const historicoCrianca = async (criancaId) => {
  const crianca = await prisma.crianca.findUnique({ where: { id: criancaId } });
  if (!crianca) throw new AppError('Criança não encontrada.', 404);

  return prisma.visita.findMany({
    where: { criancaId },
    include: { responsavel: { select: { id: true, nome: true } } },
    orderBy: [{ data: 'desc' }, { hora: 'desc' }],
  });
};

const criar = async (dados, usuarioId) => {
  const crianca = await prisma.crianca.findUnique({ where: { id: dados.criancaId } });
  if (!crianca) throw new AppError('Criança não encontrada.', 404);

  const responsavel = await prisma.usuario.findUnique({ where: { id: dados.responsavelId } });
  if (!responsavel) throw new AppError('Usuário não encontrado.', 404);

  return prisma.visita.create({
    data: {
      ...dados,
      data: new Date(dados.data),
      criadoPor: usuarioId,
    },
    include: INCLUDE,
  });
};

const editar = async (id, dados) => {
  const visita = await prisma.visita.findUnique({ where: { id } });
  if (!visita) throw new AppError('Visita não encontrada.', 404);

  const update = { ...dados };
  if (dados.responsavelId) {
    const responsavel = await prisma.usuario.findUnique({ where: { id: dados.responsavelId } });
    if (!responsavel) throw new AppError('Usuário não encontrado.', 404);
  }
  if (dados.data) update.data = new Date(dados.data);

  return prisma.visita.update({ where: { id }, data: update, include: INCLUDE });
};

const remover = async (id) => {
  const visita = await prisma.visita.findUnique({ where: { id } });
  if (!visita) throw new AppError('Visita não encontrada.', 404);
  await prisma.visita.delete({ where: { id } });
};

const listarResponsaveis = async () => {
  return prisma.usuario.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });
};

module.exports = { listar, resumo, historicoCrianca, criar, editar, remover, listarResponsaveis };
