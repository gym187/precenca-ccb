const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');
const { criarCriancaSchema } = require('./crianca.schema');

const listar = async ({ continuacaoId, ativo = 'true', usuario } = {}) => {
  const where = {};

  if (usuario && !usuario.todasContinuacoes) {
    const permitidos = usuario.continuacoes;
    if (continuacaoId) {
      if (!permitidos.includes(continuacaoId)) return [];
      where.continuacaoId = continuacaoId;
    } else {
      where.continuacaoId = { in: permitidos };
    }
  } else if (continuacaoId) {
    where.continuacaoId = continuacaoId;
  }

  if (ativo !== undefined) where.ativo = ativo === 'true';

  return prisma.crianca.findMany({
    where,
    include: { continuacao: { select: { id: true, nome: true } } },
    orderBy: { nomeCompleto: 'asc' },
  });
};

const buscarPorId = async (id) => {
  const crianca = await prisma.crianca.findUnique({
    where: { id },
    include: {
      continuacao: { select: { id: true, nome: true } },
      transferencias: {
        include: {
          continuacaoOrigem: { select: { id: true, nome: true } },
          continuacaoDestino: { select: { id: true, nome: true } },
        },
        orderBy: { dataTransferencia: 'asc' },
      },
    },
  });
  if (!crianca) throw new AppError('Criança não encontrada.', 404);
  return crianca;
};

const criar = async (dados) => {
  const parsed = criarCriancaSchema.parse(dados);

  const continuacao = await prisma.continuacao.findUnique({
    where: { id: parsed.continuacaoId },
  });
  if (!continuacao) throw new AppError('Continuação não encontrada.', 404);

  return prisma.crianca.create({
    data: {
      ...parsed,
      dataNascimento: new Date(parsed.dataNascimento),
    },
    include: { continuacao: { select: { id: true, nome: true } } },
  });
};

const atualizar = async (id, dados) => {
  await buscarPorId(id);

  if (dados.continuacaoId) {
    const cont = await prisma.continuacao.findUnique({
      where: { id: dados.continuacaoId },
    });
    if (!cont) throw new AppError('Continuação não encontrada.', 404);
  }

  const dataFormatada = dados.dataNascimento
    ? { dataNascimento: new Date(dados.dataNascimento) }
    : {};

  return prisma.crianca.update({
    where: { id },
    data: { ...dados, ...dataFormatada },
    include: { continuacao: { select: { id: true, nome: true } } },
  });
};

const remover = async (id, { motivo, observacao } = {}) => {
  const crianca = await buscarPorId(id);
  if (!crianca.ativo) throw new AppError('Cadastro já está inativo.', 409);

  const motivoFinal = motivo === 'outros'
    ? `outros: ${observacao.trim()}`
    : motivo ?? null;

  await prisma.crianca.update({
    where: { id },
    data: {
      ativo: false,
      motivoArquivamento: motivoFinal,
      dataArquivamento: new Date(),
    },
  });
};

const buscarHistorico = async (id, filtros = {}) => {
  await buscarPorId(id);

  const where = { criancaId: id };

  if (filtros.mes) {
    const [ano, mes] = filtros.mes.split('-').map(Number);
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0);
    where.data = { gte: inicio, lte: fim };
  } else if (filtros.trimestre) {
    const ano = new Date().getFullYear();
    const t = Number(filtros.trimestre);
    const inicio = new Date(ano, (t - 1) * 3, 1);
    const fim = new Date(ano, t * 3, 0);
    where.data = { gte: inicio, lte: fim };
  } else if (filtros.periodo && filtros.periodo !== 'all') {
    const meses = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[filtros.periodo];
    if (meses) {
      const fim = new Date();
      const inicio = new Date();
      inicio.setMonth(inicio.getMonth() - meses);
      where.data = { gte: inicio, lte: fim };
    }
  } else if (filtros.dataInicio && filtros.dataFim) {
    where.data = {
      gte: new Date(filtros.dataInicio),
      lte: new Date(filtros.dataFim),
    };
  }

  const presencas = await prisma.presenca.findMany({
    where,
    orderBy: { data: 'desc' },
    select: { id: true, criancaId: true, data: true, status: true, observacao: true, tipoReuniao: true, criadoEm: true },
  });

  const total = presencas.length;
  const presentes = presencas.filter((p) => p.status === 'presente').length;
  const ausentes = presencas.filter((p) => p.status === 'ausente').length;
  const justificados = presencas.filter((p) => p.status === 'justificado').length;
  const percPresenca = total ? Math.round((presentes / total) * 100) : 0;

  // Calcular faltas consecutivas atuais
  let faltasConsecutivas = 0;
  for (const p of presencas) {
    if (p.status !== 'presente') faltasConsecutivas++;
    else break;
  }

  // Filtrar por status se solicitado (retorna lista filtrada mantendo estatísticas gerais)
  const historicoFiltrado = filtros.status
    ? presencas.filter((p) => p.status === filtros.status)
    : presencas;

  return {
    historico: historicoFiltrado,
    estatisticas: {
      total,
      presentes,
      ausentes,
      justificados,
      percPresenca,
      faltasConsecutivas,
    },
  };
};

module.exports = { listar, buscarPorId, criar, atualizar, remover, buscarHistorico };
