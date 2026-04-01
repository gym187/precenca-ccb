const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

/**
 * Transfere a criança para outra continuação.
 * Mantém o histórico e atualiza continuacaoId na criança a partir da data.
 */
const transferir = async ({ criancaId, continuacaoDestinoId, dataTransferencia }) => {
  const crianca = await prisma.crianca.findUnique({ where: { id: criancaId } });
  if (!crianca) throw new AppError('Criança não encontrada.', 404);

  const destino = await prisma.continuacao.findUnique({
    where: { id: continuacaoDestinoId },
  });
  if (!destino) throw new AppError('Continuação destino não encontrada.', 404);

  if (crianca.continuacaoId === continuacaoDestinoId) {
    throw new AppError('A criança já pertence a esta continuação.', 409);
  }

  const dataObj = dataTransferencia ? new Date(dataTransferencia) : new Date();

  // Registrar transferência no histórico
  const transferencia = await prisma.transferencia.create({
    data: {
      criancaId,
      continuacaoOrigemId: crianca.continuacaoId,
      continuacaoDestinoId,
      dataTransferencia: dataObj,
    },
    include: {
      continuacaoOrigem: { select: { id: true, nome: true } },
      continuacaoDestino: { select: { id: true, nome: true } },
      crianca: { select: { id: true, nomeCompleto: true } },
    },
  });

  // Atualizar continuação atual da criança
  await prisma.crianca.update({
    where: { id: criancaId },
    data: { continuacaoId: continuacaoDestinoId },
  });

  return transferencia;
};

const historicosPorCrianca = async (criancaId) => {
  const crianca = await prisma.crianca.findUnique({ where: { id: criancaId } });
  if (!crianca) throw new AppError('Criança não encontrada.', 404);

  return prisma.transferencia.findMany({
    where: { criancaId },
    include: {
      continuacaoOrigem: { select: { id: true, nome: true } },
      continuacaoDestino: { select: { id: true, nome: true } },
    },
    orderBy: { dataTransferencia: 'asc' },
  });
};

module.exports = { transferir, historicosPorCrianca };
