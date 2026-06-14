const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');
const { resolverIntervalo } = require('../../utils/dateRange');

const calcPercPresenca = (presentes, total) =>
  total === 0 ? 0 : Math.round((presentes / total) * 100);

// ─── Resumo por continuação ──────────────────────────────────────────────────

const resumoContinuacao = async (continuacaoId, { mes, trimestre, periodo, dataInicio, dataFim } = {}, usuario) => {
  if (
    usuario &&
    !usuario.todasContinuacoes &&
    !usuario.continuacoes.includes(continuacaoId)
  ) {
    throw new AppError('Sem acesso a esta continuação.', 403);
  }

  const cont = await prisma.continuacao.findUnique({ where: { id: continuacaoId } });
  if (!cont) throw new AppError('Continuação não encontrada.', 404);

  const intervalo = resolverIntervalo({ mes, trimestre, periodo, dataInicio, dataFim });

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

// ─── Faltas consecutivas ────────────────────────────────────────────────────
//
// Conta faltas em sequência a partir da última presença registrada.
// Se a criança esteve presente na última reunião lançada, sai do alerta.
// Default: 2 faltas seguidas (anteriormente o endpoint contava o total de
// faltas em 30 dias, o que mantinha a criança em alerta o mês inteiro).

const faltasNoPeriodo = async ({ continuacaoId, minFaltas = 2 } = {}, usuario) => {
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
      ultimoContatoEm: true,
      continuacao: { select: { nome: true } },
    },
  });

  if (criancas.length === 0) return [];

  // Janela de 90 dias é suficiente para identificar sequências; reuniões
  // ocorrem semanalmente, então ~12 lançamentos cobrem qualquer streak real.
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 90);

  const presencas = await prisma.presenca.findMany({
    where: {
      criancaId: { in: criancas.map((c) => c.id) },
      data: { gte: inicio },
    },
    select: { criancaId: true, data: true, status: true },
    orderBy: { data: 'desc' },
  });

  const porCrianca = {};
  for (const p of presencas) {
    if (!porCrianca[p.criancaId]) porCrianca[p.criancaId] = [];
    porCrianca[p.criancaId].push(p);
  }

  // Conta consecutivas a partir da última presença. Ignora faltas anteriores
  // a um contato já registrado — se o auxiliar marcou "✓ contatado" após a
  // falta, ela sai do alerta até uma falta nova depois disso.
  const consecutivas = {};
  const mapaCriancas = new Map(criancas.map((c) => [c.id, c]));
  for (const [id, registros] of Object.entries(porCrianca)) {
    const ultimoContato = mapaCriancas.get(id)?.ultimoContatoEm;
    let count = 0;
    for (const r of registros) {
      if (r.status === 'presente') break;
      if (ultimoContato && r.data <= ultimoContato) break;
      count++;
    }
    consecutivas[id] = count;
  }

  return criancas
    .filter((c) => (consecutivas[c.id] ?? 0) >= Number(minFaltas))
    .map((c) => ({
      id: c.id,
      nomeCompleto: c.nomeCompleto,
      nomeResponsavel: c.nomeResponsavel,
      telefoneResponsavel: c.telefoneResponsavel,
      continuacao: c.continuacao,
      faltasConsecutivas: consecutivas[c.id],
    }))
    .sort((a, b) => b.faltasConsecutivas - a.faltasConsecutivas);
};

// ─── Helpers para série temporal ────────────────────────────────────────────────

const getSemanas = (inicio, fim) => {
  const semanas = [];
  const d = new Date(inicio);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); // ajusta para segunda-feira
  while (d <= fim) {
    semanas.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return semanas;
};

const getMeses = (inicio, fim) => {
  const meses = [];
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (d <= fim) {
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return meses;
};

// ─── Série temporal: presença semanal e visitas mensais ─────────────────────────

const serieTemporal = async ({ dataInicio, dataFim }, usuario) => {
  const inicio = new Date(dataInicio + 'T00:00:00');
  const fim    = new Date(dataFim   + 'T23:59:59');

  const continuacoes = await prisma.continuacao.findMany({
    where: usuario.todasContinuacoes ? {} : { id: { in: usuario.continuacoes } },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });

  // ids de crianças ativas por continuação
  const todasCriancas = await prisma.crianca.findMany({
    where: { continuacaoId: { in: continuacoes.map((c) => c.id) }, ativo: true },
    select: { id: true, continuacaoId: true },
  });
  const criancasPorCont = {};
  for (const cont of continuacoes) criancasPorCont[cont.id] = [];
  for (const c of todasCriancas) criancasPorCont[c.continuacaoId].push(c.id);
  const todosIds = todasCriancas.map((c) => c.id);

  // presencas no período
  const presencas = await prisma.presenca.findMany({
    where: { criancaId: { in: todosIds }, data: { gte: inicio, lte: fim } },
    select: { criancaId: true, data: true, status: true },
  });

  // visitas no período
  const visitas = await prisma.visita.findMany({
    where: {
      data: { gte: inicio, lte: fim },
      crianca: { continuacaoId: { in: continuacoes.map((c) => c.id) }, ativo: true },
    },
    select: { data: true, status: true, crianca: { select: { continuacaoId: true } } },
  });

  // série presença por semana
  const semanasDate = getSemanas(inicio, fim);
  const semanasStr  = semanasDate.map((d) => d.toISOString().slice(0, 10));

  const seriesPresenca = continuacoes.map((cont) => {
    const ids = new Set(criancasPorCont[cont.id]);
    const pontos = semanasDate.map((semIni) => {
      const semFim = new Date(semIni);
      semFim.setDate(semFim.getDate() + 6);
      semFim.setHours(23, 59, 59);
      const regs = presencas.filter(
        (p) => ids.has(p.criancaId) && p.data >= semIni && p.data <= semFim
      );
      if (regs.length === 0) return null;
      return regs.filter((p) => p.status === 'presente').length;
    });
    return { continuacaoId: cont.id, nome: cont.nome, pontos };
  });

  // série visitas por mês
  const meses = getMeses(inicio, fim);

  const seriesVisitas = continuacoes.map((cont) => {
    const pontos = meses.map((mes) => {
      const [ano, mesNum] = mes.split('-').map(Number);
      return visitas.filter(
        (v) =>
          v.crianca.continuacaoId === cont.id &&
          v.status === 'concluida' &&
          v.data.getFullYear() === ano &&
          v.data.getMonth() + 1 === mesNum
      ).length;
    });
    return { continuacaoId: cont.id, nome: cont.nome, pontos };
  });

  // resumo totais do período
  const resumoPresenca = continuacoes.map((cont) => {
    const ids          = new Set(criancasPorCont[cont.id]);
    const regs         = presencas.filter((p) => ids.has(p.criancaId));
    const presentes    = regs.filter((p) => p.status === 'presente').length;
    const ausentes     = regs.filter((p) => p.status === 'ausente').length;
    const justificados = regs.filter((p) => p.status === 'justificado').length;
    const total        = regs.length;
    return {
      continuacaoId: cont.id,
      nome: cont.nome,
      percPresenca: calcPercPresenca(presentes, total),
      presentes,
      ausentes,
      justificados,
    };
  });

  const resumoVisitas = continuacoes.map((cont) => {
    const vs = visitas.filter((v) => v.crianca.continuacaoId === cont.id);
    return {
      continuacaoId: cont.id,
      nome:          cont.nome,
      concluidas:    vs.filter((v) => v.status === 'concluida').length,
      pendentes:     vs.filter((v) => v.status === 'pendente').length,
      remarcadas:    vs.filter((v) => v.status === 'remarcada').length,
    };
  });

  return {
    presenca: { semanas: semanasStr, series: seriesPresenca },
    visitas:  { meses,               series: seriesVisitas  },
    resumo:   { presenca: resumoPresenca, visitas: resumoVisitas },
  };
};

// ─── Resumo de todas as continuações do usuário ──────────────────────────────

const resumoTodasContinuacoes = async (params, usuario) => {
  const continuacoes = await prisma.continuacao.findMany({
    where: usuario.todasContinuacoes ? {} : { id: { in: usuario.continuacoes } },
    select: { id: true },
    orderBy: { nome: 'asc' },
  });

  return Promise.all(
    continuacoes.map((c) => resumoContinuacao(c.id, params, usuario))
  );
};

module.exports = { resumoContinuacao, resumoTodasContinuacoes, aniversariantesMes, faltasNoPeriodo, serieTemporal };
