const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const includeAuxiliares = {
  auxiliares: {
    include: { usuario: { select: { id: true, nome: true } } },
  },
};

const listar = async (usuario) => {
  const where = usuario?.todasContinuacoes
    ? {}
    : { id: { in: usuario?.continuacoes ?? [] } };

  const conts = await prisma.continuacao.findMany({
    where,
    orderBy: { nome: 'asc' },
    include: {
      ...includeAuxiliares,
      _count: { select: { criancas: true } },
    },
  });

  return conts.map(formatAuxiliares);
};

const listarTodas = async () => {
  return prisma.continuacao.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });
};

const buscarPorId = async (id, usuario) => {
  if (
    usuario &&
    !usuario.todasContinuacoes &&
    !usuario.continuacoes.includes(id)
  ) {
    throw new AppError('Sem acesso a esta continuação.', 403);
  }

  const cont = await prisma.continuacao.findUnique({
    where: { id },
    include: {
      ...includeAuxiliares,
      criancas: {
        where: { ativo: true },
        orderBy: { nomeCompleto: 'asc' },
      },
      _count: { select: { criancas: true } },
    },
  });
  if (!cont) throw new AppError('Continuação não encontrada.', 404);
  return formatAuxiliares(cont);
};

const criar = async (dados) => {
  const { auxiliarIds, ...rest } = dados;
  const cont = await prisma.continuacao.create({
    data: {
      ...rest,
      ...(auxiliarIds?.length && {
        auxiliares: {
          create: auxiliarIds.map((uid) => ({ usuarioId: uid })),
        },
      }),
    },
    include: { ...includeAuxiliares, _count: { select: { criancas: true } } },
  });
  return formatAuxiliares(cont);
};

const atualizar = async (id, dados) => {
  await buscarPorId(id);
  const { auxiliarIds, ...rest } = dados;

  if (auxiliarIds !== undefined) {
    await prisma.auxiliarContinuacao.deleteMany({ where: { continuacaoId: id } });
    if (auxiliarIds.length > 0) {
      await prisma.auxiliarContinuacao.createMany({
        data: auxiliarIds.map((uid) => ({ usuarioId: uid, continuacaoId: id })),
      });
    }
  }

  const cont = await prisma.continuacao.update({
    where: { id },
    data: rest,
    include: { ...includeAuxiliares, _count: { select: { criancas: true } } },
  });
  return formatAuxiliares(cont);
};

const remover = async (id) => {
  await buscarPorId(id);

  const ativas = await prisma.crianca.count({
    where: { continuacaoId: id, ativo: true },
  });
  if (ativas > 0)
    throw new AppError('Não é possível remover uma continuação com jovens/menores ativos.', 409);

  // Criancas inativas ainda têm FK para esta continuação.
  // Cascatear a exclusão manualmente para preservar integridade.
  const inativas = await prisma.crianca.findMany({
    where: { continuacaoId: id, ativo: false },
    select: { id: true },
  });

  if (inativas.length > 0) {
    const ids = inativas.map((c) => c.id);

    // 1. Presencas dessas crianças → auditorias
    const presencas = await prisma.presenca.findMany({
      where: { criancaId: { in: ids } },
      select: { id: true },
    });
    if (presencas.length > 0) {
      const presencaIds = presencas.map((p) => p.id);
      await prisma.auditoriaPresenca.deleteMany({ where: { presencaId: { in: presencaIds } } });
      await prisma.presenca.deleteMany({ where: { id: { in: presencaIds } } });
    }

    // 2. Transferencias dessas crianças
    await prisma.transferencia.deleteMany({ where: { criancaId: { in: ids } } });

    // 3. Excluir as criancas inativas
    await prisma.crianca.deleteMany({ where: { id: { in: ids } } });
  }

  // 4. Transferencias que referenciam esta continuação como origem ou destino
  await prisma.transferencia.deleteMany({
    where: {
      OR: [{ continuacaoOrigemId: id }, { continuacaoDestinoId: id }],
    },
  });

  // 5. Excluir a continuação (UsuarioContinuacao e AuxiliarContinuacao têm onDelete: Cascade)
  await prisma.continuacao.delete({ where: { id } });
};

/** Flatten auxiliares join into a simple array of {id, nome} */
const formatAuxiliares = (cont) => {
  if (!cont) return cont;
  const { auxiliares, ...rest } = cont;
  return {
    ...rest,
    auxiliares: (auxiliares || []).map((a) => a.usuario),
  };
};

module.exports = { listar, listarTodas, buscarPorId, criar, atualizar, remover };
