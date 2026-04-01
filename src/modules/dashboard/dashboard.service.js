const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retorna {inicio, fim} para mês no formato "YYYY-MM".
 */
const intervaloPorMes = (anoMes) => {
  const [ano, mes] = anoMes.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0);
  return { inicio, fim };
};

/**
 * Retorna {inicio, fim} para trimestre (1-4) no ano corrente.
 */
const intervaloPorTrimestre = (trimestre, ano = new Date().getFullYear()) => {
  const t = Number(trimestre);
  const inicio = new Date(ano, (t - 1) * 3, 1);
  const fim = new Date(ano, t * 3, 0);
  return { inicio, fim };
};

/**
 * Resolve o intervalo de datas a partir dos parâmetros da query.
 * Suporta: mes=YYYY-MM | trimestre=1-4 | periodo=1m|3m|6m|12m|all
 * Padrão: mês atual.
 */
const resolverIntervalo = ({ mes, trimestre, periodo } = {}) => {
  if (mes) return intervaloPorMes(mes);
  if (trimestre) return intervaloPorTrimestre(trimestre);

  const now = new Date();
  if (periodo === 'all') return null; // sem filtro de data

  if (periodo) {
    const meses = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[periodo];
    if (meses) {
      const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const inicio = new Date(fim);
      inicio.setMonth(inicio.getMonth() - meses);
      return { inicio, fim };
    }
  }

  // Padrão: mês atual
  return intervaloPorMes(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
};

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

// ─── Faltas consecutivas ─────────────────────────────────────────────────────

const faltasConsecutivas = async ({ continuacaoId, minFaltas = 2 } = {}, usuario) => {
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

  const resultado = [];

  for (const crianca of criancas) {
    const presencas = await prisma.presenca.findMany({
      where: { criancaId: crianca.id },
      orderBy: { data: 'desc' },
      take: 10,
    });

    let faltas = 0;
    for (const p of presencas) {
      if (p.status !== 'presente') faltas++;
      else break;
    }

    if (faltas >= Number(minFaltas)) {
      resultado.push({ ...crianca, faltasConsecutivas: faltas });
    }
  }

  return resultado.sort((a, b) => b.faltasConsecutivas - a.faltasConsecutivas);
};

module.exports = { resumoContinuacao, aniversariantesMes, faltasConsecutivas };
