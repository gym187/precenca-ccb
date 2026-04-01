const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const includePermissoes = {
  permissoes: { include: { permissao: true } },
};

const formatRole = (r) => ({
  id: r.id,
  nome: r.nome,
  fixa: r.fixa,
  permissoes: r.permissoes?.map((rp) => ({
    id: rp.permissao.id,
    nome: rp.permissao.nome,
  })),
});

const listar = async () => {
  const roles = await prisma.role.findMany({ include: includePermissoes });
  return roles.map(formatRole);
};

const buscarPorId = async (id) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: includePermissoes,
  });
  if (!role) throw new AppError('Role não encontrada.', 404);
  return formatRole(role);
};

const criar = async ({ nome, fixa }) => {
  const role = await prisma.role.create({
    data: { nome, fixa: fixa ?? false },
    include: includePermissoes,
  });
  return formatRole(role);
};

const atualizar = async (id, dados) => {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('Role não encontrada.', 404);
  if (role.fixa) throw new AppError('Roles fixas não podem ser alteradas.', 403);

  const atualizada = await prisma.role.update({
    where: { id },
    data: dados,
    include: includePermissoes,
  });
  return formatRole(atualizada);
};

const remover = async (id) => {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('Role não encontrada.', 404);
  if (role.fixa) throw new AppError('Role fixa não pode ser removida.', 403);
  await prisma.role.delete({ where: { id } });
};

const atribuirPermissao = async (roleId, permissaoId) => {
  await buscarPorId(roleId);

  const permissao = await prisma.permissao.findUnique({ where: { id: permissaoId } });
  if (!permissao) throw new AppError('Permissão não encontrada.', 404);

  await prisma.rolePermissao.upsert({
    where: { roleId_permissaoId: { roleId, permissaoId } },
    create: { roleId, permissaoId },
    update: {},
  });
  return buscarPorId(roleId);
};

const removerPermissao = async (roleId, permissaoId) => {
  await buscarPorId(roleId);
  await prisma.rolePermissao.delete({
    where: { roleId_permissaoId: { roleId, permissaoId } },
  });
  return buscarPorId(roleId);
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  atribuirPermissao,
  removerPermissao,
};
