const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

/**
 * Lançamento em lote (checklist).
 * Para cada item da lista, faz upsert (cria ou atualiza).
 * Registra auditoria em caso de atualização.
 */
const lancarLista = async ({ data, tipoReuniao, presencas }, usuarioId, usuario) => {
  const dataObj = new Date(data);
  const resultados = [];
  const erros = [];

  // Validar acesso às continuações das crianças (para não-admins)
  if (usuario && !usuario.todasContinuacoes) {
    const ids = presencas.map((p) => p.criancaId);
    const criancasData = await prisma.crianca.findMany({
      where: { id: { in: ids } },
      select: { continuacaoId: true },
    });
    for (const c of criancasData) {
      if (!usuario.continuacoes.includes(c.continuacaoId)) {
        throw new AppError('Sem acesso a uma ou mais continuações desta lista.', 403);
      }
    }
  }

  for (const item of presencas) {
    try {
      const existente = await prisma.presenca.findUnique({
        where: { criancaId_data: { criancaId: item.criancaId, data: dataObj } },
      });

      if (existente) {
        // Atualização — registrar auditoria
        const atualizada = await prisma.presenca.update({
          where: { criancaId_data: { criancaId: item.criancaId, data: dataObj } },
          data: { status: item.status, observacao: item.observacao ?? null, criadoPor: usuarioId },
        });

        await prisma.auditoriaPresenca.create({
          data: {
            presencaId: atualizada.id,
            alteradoPor: usuarioId,
            alteracao: JSON.stringify({
              campo: 'status',
              de: existente.status,
              para: item.status,
            }),
          },
        });

        resultados.push({ criancaId: item.criancaId, acao: 'atualizado', status: item.status });
      } else {
        // Criação
        const crianca = await prisma.crianca.findUnique({ where: { id: item.criancaId } });
        if (!crianca) {
          erros.push({ criancaId: item.criancaId, erro: 'Criança não encontrada.' });
          continue;
        }

        await prisma.presenca.create({
          data: {
            criancaId: item.criancaId,
            data: dataObj,
            tipoReuniao,
            status: item.status,
            observacao: item.observacao ?? null,
            criadoPor: usuarioId,
          },
        });

        resultados.push({ criancaId: item.criancaId, acao: 'criado', status: item.status });
      }
    } catch (err) {
      erros.push({ criancaId: item.criancaId, erro: err.message });
    }
  }

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

module.exports = { lancarLista, editar, listar, buscarAuditoria };
