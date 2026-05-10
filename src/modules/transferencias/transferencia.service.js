const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const transferir = async ({ criancaId, continuacaoDestinoId, dataTransferencia }, usuario) => {
  const crianca = await prisma.crianca.findUnique({ where: { id: criancaId } });
  if (!crianca) throw new AppError('Criança não encontrada.', 404);

  if (usuario && !usuario.todasContinuacoes && !usuario.continuacoes.includes(crianca.continuacaoId)) {
    throw new AppError('Sem acesso a esta continuação.', 403);
  }

  const destino = await prisma.continuacao.findUnique({ where: { id: continuacaoDestinoId } });
  if (!destino) throw new AppError('Continuação destino não encontrada.', 404);

  if (crianca.continuacaoId === continuacaoDestinoId) {
    throw new AppError('A criança já pertence a esta continuação.', 409);
  }

  const dataObj = dataTransferencia ? new Date(dataTransferencia) : new Date();

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
