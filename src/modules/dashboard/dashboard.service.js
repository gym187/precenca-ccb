const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');
const { resolverIntervalo } = require('../../utils/dateRange');

const calcPercPresenca = (presentes, total) =>
  total === 0 ? 0 : Math.round((presentes / total) * 100);

// ─── Resumo por continuação ──────────────────────────────────────────────────

const resumoContinuacao = async (continuacaoId, { mes, trimestre, periodo } = {}, usuario) => {
  if (
    usuario &&
    !usuario.todasContinuacoes &&
    !usuario.continuacoes.includes(continuacaoId)
  ) {
    throw new AppError('Sem acesso a esta continuação.', 403);
  }

  const cont = await prisma.continuacao.findUnique({ where: { id: continuacaoId } });
  if (!cont) throw new AppError('Continuação não encontrada.', 404);

  const intervalo = resolverIntervalo({ mes, trimestre, periodo });

  const criancasIds = await prisma.crianca.findMany({
    where: { continuacaoId, ativo: true },
    select: { id: true },
  });
  const ids = criancasIds.map((c) => c.id);

  if (ids.length === 0) {
    return { continuacao: { id: cont.id, nome: cont.nome }, totalCriancas: 0, periodo: null, ranking: [] };
  }

  const wherePresenca = { criancaId: { in: ids } };
  if (intervalo) wherePresenca.data = { gte: intervalo.inicio, lte: intervalo.fim };

  const presencasPeriodo = await prisma.presenca.findMany({ where: wherePresenca });

  const totalPeriodo = presencasPeriodo.length;
  const presentesPeriodo = presencasPeriodo.filter((p) => p.status === 'presente').length;

  const contagemPorCrianca = {};
  for (const p of presencasPeriodo) {
    if (!contagemPorCrianca[p.criancaId]) {
      contagemPorCrianca[p.criancaId] = { presentes: 0, ausentes: 0, justificados: 0, total: 0 };
    }
    contagemPorCrianca[p.criancaId].total++;
    if (p.status === 'presente') contagemPorCrianca[p.criancaId].presentes++;
    else if (p.status === 'ausente') contagemPorCrianca[p.criancaId].ausentes++;
    else if (p.status === 'justificado') contagemPorCrianca[p.criancaId].justificados++;
  }

  const criancas = await prisma.crianca.findMany({
    where: { id: { in: ids } },
    select: { id: true, nomeCompleto: true },
  });

  const ranking = criancas
    .map((c) => {
      const cnt = contagemPorCrianca[c.id] || { presentes: 0, ausentes: 0, justificados: 0, total: 0 };
      return {
        criancaId: c.id,
        nome: c.nomeCompleto,
        presentes: cnt.presentes,
        ausentes: cnt.ausentes,
        justificados: cnt.justificados,
        total: cnt.total,
        percPresenca: calcPercPresenca(cnt.presentes, cnt.total),
      };
    })
    .sort((a, b) => b.percPresenca - a.percPresenca);

  return {
    continuacao: { id: cont.id, nome: cont.nome },
    totalCriancas: ids.length,
    periodo: {
      inicio: intervalo?.inicio ?? null,
      fim: intervalo?.fim ?? null,
      totalRegistros: totalPeriodo,
      totalPresentes: presentesPeriodo,
      percPresenca: calcPercPresenca(presentesPeriodo, totalPeriodo),
    },
    ranking,
  };
};

// ─── Aniversariantes do mês ──────────────────────────────────────────────────

const aniversariantesMes = async ({ continuacaoId, mes } = {}, usuario) => {
  const mesAtual = mes ? Number(mes) : new Date().getMonth() + 1;

  const where = { ativo: true };
  if (continuacaoId) {
    if (usuario && !usuario.todasContinuacoes && !usuario.continuacoes.includes(continuacaoId)) {
      throw new AppError('Sem acesso a esta continuação.', 403);
    }
    where.continuacaoId = continuacaoId;
  } else if (usuario && !usuario.todasContinuacoes) {
    where.continuacaoId = { in: usuario.continuacoes };
  }

  const criancas = await prisma.crianca.findMany({
    where,
    select: {
      id: true,
      nomeCompleto: true,
      dataNascimento: true,
      continuacao: { select: { nome: true } },
    },
  });

  return criancas
    .filter((c) => new Date(c.dataNascimento).getMonth() + 1 === mesAtual)
    .map((c) => ({
      ...c,
      idade: new Date().getFullYear() - new Date(c.dataNascimento).getFullYear(),
    }))
    .sort((a, b) => new Date(a.dataNascimento).getDate() - new Date(b.dataNascimento).getDate());
};

// ─── Faltas no período ──────────────────────────────────────────────────────

const faltasNoPeriodo = async ({ continuacaoId, minFaltas = 3 } = {}, usuario) => {
  const where = { ativo: true };
  if (continuacaoId) {
    if (usuario && !usuario.todasContinuacoes && !usuario.continuacoes.includes(continuacaoId)) {
      throw new AppError('Sem acesso a esta continuação.', 403);
    }
    where.continuacaoId = continuacaoId;
  } else if (usuario && !usuario.todasContinuacoes) {
    where.continuacaoId = { in: usuario.continuacoes };
  }

  const criancas = await prisma.crianca.findMany({
    where,
    select: {
      id: true,
      nomeCompleto: true,
      nomeResponsavel: true,
      telefoneResponsavel: true,
      continuacao: { select: { nome: true } },
    },
  });

  if (criancas.length === 0) return [];

  const inicio30d = new Date();
  inicio30d.setDate(inicio30d.getDate() - 30);

  const faltas = await prisma.presenca.findMany({
    where: {
      criancaId: { in: criancas.map((c) => c.id) },
      data: { gte: inicio30d },
      status: { not: 'presente' },
    },
    select: { criancaId: true },
  });

  const contagemFaltas = {};
  for (const f of faltas) {
    contagemFaltas[f.criancaId] = (contagemFaltas[f.criancaId] ?? 0) + 1;
  }

  return criancas
    .filter((c) => (contagemFaltas[c.id] ?? 0) >= Number(minFaltas))
    .map((c) => ({ ...c, faltasNoPeriodo: contagemFaltas[c.id] }))
    .sort((a, b) => b.faltasNoPeriodo - a.faltasNoPeriodo);
};

module.exports = { resumoContinuacao, aniversariantesMes, faltasNoPeriodo };
