const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

/**
 * Lançamento em lote (checklist).
 * Para cada item da lista, faz upsert (cria ou atualiza).
 * Registra auditoria em caso de atualização.
 */
const lancarLista = async ({ data, tipoReuniao, presencas }, usuarioId, usuario) => {
  const dataObj = new Date(data);
  const ids = presencas.map((p) => p.criancaId);

  // 1 query: buscar todas as crianças de uma vez (validação de acesso + existência)
  const criancas = await prisma.crianca.findMany({
    where: { id: { in: ids } },
    select: { id: true, continuacaoId: true },
  });

  if (usuario && !usuario.todasContinuacoes) {
    for (const c of criancas) {
      if (!usuario.continuacoes.includes(c.continuacaoId)) {
        throw new AppError('Sem acesso a uma ou mais continuações desta lista.', 403);
      }
    }
  }

  const criancaIds = new Set(criancas.map((c) => c.id));
  const erros = [];

  // 1 query: buscar presenças já existentes nessa data
  const existentes = await prisma.presenca.findMany({
    where: { criancaId: { in: ids }, data: dataObj },
    select: { id: true, criancaId: true, status: true },
  });
  const existenteMap = new Map(existentes.map((p) => [p.criancaId, p]));

  const toCreate = [];
  const toUpdate = [];

  for (const item of presencas) {
    if (!criancaIds.has(item.criancaId)) {
      erros.push({ criancaId: item.criancaId, erro: 'Criança não encontrada.' });
      continue;
    }
    const existente = existenteMap.get(item.criancaId);
    if (existente) {
      toUpdate.push({ existente, item });
    } else {
      toCreate.push(item);
    }
  }

  // 1 transaction: todos os creates, updates e auditorias
  await prisma.$transaction([
    ...toCreate.map((item) =>
      prisma.presenca.create({
        data: {
          criancaId: item.criancaId,
          data: dataObj,
          tipoReuniao,
          status: item.status,
          observacao: item.observacao ?? null,
          criadoPor: usuarioId,
        },
      })
    ),
    ...toUpdate.map(({ existente, item }) =>
      prisma.presenca.update({
        where: { id: existente.id },
        data: { status: item.status, observacao: item.observacao ?? null, criadoPor: usuarioId },
      })
    ),
    ...toUpdate.map(({ existente, item }) =>
      prisma.auditoriaPresenca.create({
        data: {
          presencaId: existente.id,
          alteradoPor: usuarioId,
          alteracao: JSON.stringify({ campo: 'status', de: existente.status, para: item.status }),
        },
      })
    ),
  ]);

  const resultados = [
    ...toCreate.map((item) => ({ criancaId: item.criancaId, acao: 'criado', status: item.status })),
    ...toUpdate.map(({ item }) => ({ criancaId: item.criancaId, acao: 'atualizado', status: item.status })),
  ];

  return { processados: resultados.length, resultados, erros };
};

const editar = async (id, { status, motivo }, usuarioId) => {
  const presenca = await prisma.presenca.findUnique({ where: { id } });
  if (!presenca) throw new AppError('Presença não encontrada.', 404);

  const atualizada = await prisma.presenca.update({
    where: { id },
    data: { status },
  });

  await prisma.auditoriaPresenca.create({
    data: {
      presencaId: id,
      alteradoPor: usuarioId,
      alteracao: JSON.stringify({
        campo: 'status',
        de: presenca.status,
        para: status,
        motivo: motivo || null,
      }),
    },
  });

  return atualizada;
};

const listar = async ({ criancaId, continuacaoId, data, dataInicio, dataFim, usuario } = {}) => {
  const where = {};

  if (criancaId) where.criancaId = criancaId;
  if (data) where.data = new Date(data);
  if (dataInicio && dataFim)
    where.data = { gte: new Date(dataInicio), lte: new Date(dataFim) };

  if (continuacaoId) {
    where.crianca = { continuacaoId };
  } else if (usuario && !usuario.todasContinuacoes) {
    where.crianca = { continuacaoId: { in: usuario.continuacoes } };
  }

  return prisma.presenca.findMany({
    where,
    include: {
      crianca: { select: { id: true, nomeCompleto: true, continuacaoId: true } },
    },
    orderBy: { data: 'desc' },
  });
};

const buscarAuditoria = async (presencaId) => {
  const presenca = await prisma.presenca.findUnique({ where: { id: presencaId } });
  if (!presenca) throw new AppError('Presença não encontrada.', 404);

  return prisma.auditoriaPresenca.findMany({
    where: { presencaId },
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: { data: 'desc' },
  });
};

const listarDatas = async ({ continuacaoId } = {}, usuario) => {
  if (!continuacaoId) throw new AppError('continuacaoId é obrigatório.', 400);

  if (usuario && !usuario.todasContinuacoes && !usuario.continuacoes.includes(continuacaoId)) {
    throw new AppError('Sem acesso a esta continuação.', 403);
  }

  const criancas = await prisma.crianca.findMany({
    where: { continuacaoId },
    select: { id: true },
  });
  const ids = criancas.map((c) => c.id);

  if (ids.length === 0) return [];

  const grupos = await prisma.presenca.groupBy({
    by: ['data'],
    where: { criancaId: { in: ids } },
    _count: { id: true },
    orderBy: { data: 'desc' },
  });

  return grupos.map((g) => ({
    data: g.data.toISOString().slice(0, 10),
    total: g._count.id,
  }));
};

module.exports = { lancarLista, editar, listar, buscarAuditoria, listarDatas };
