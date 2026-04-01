const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const listar = async () => prisma.permissao.findMany({ orderBy: { nome: 'asc' } });

const criar = async ({ nome }) => {
  const existe = await prisma.permissao.findUnique({ where: { nome } });
  if (existe) throw new AppError('Permissão já existe.', 409);
  return prisma.permissao.create({ data: { nome } });
};

const remover = async (id) => {
  const permissao = await prisma.permissao.findUnique({ where: { id } });
  if (!permissao) throw new AppError('Permissão não encontrada.', 404);
  await prisma.permissao.delete({ where: { id } });
};

module.exports = { listar, criar, remover };
