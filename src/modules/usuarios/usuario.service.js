const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const SALT_ROUNDS = 12;

const includeRoles = {
  roles: {
    include: {
      role: {
        include: { permissoes: { include: { permissao: true } } },
      },
    },
  },
};

const formatUsuario = (u) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  criadoEm: u.criadoEm,
  roles: u.roles?.map((ur) => ({
    id: ur.role.id,
    nome: ur.role.nome,
    fixa: ur.role.fixa,
    permissoes: ur.role.permissoes.map((rp) => rp.permissao.nome),
  })),
});

const listar = async () => {
  const usuarios = await prisma.usuario.findMany({ include: includeRoles });
  return usuarios.map(formatUsuario);
};

const buscarPorId = async (id) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: includeRoles,
  });
  if (!usuario) throw new AppError('Usuário não encontrado.', 404);
  return formatUsuario(usuario);
};

const criar = async ({ nome, email, senha }) => {
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) throw new AppError('E-mail já cadastrado.', 409);

  const hash = await bcrypt.hash(senha, SALT_ROUNDS);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senha: hash },
    include: includeRoles,
  });
  return formatUsuario(usuario);
};

const atualizar = async (id, dados) => {
  await buscarPorId(id);

  if (dados.senha) {
    dados.senha = await bcrypt.hash(dados.senha, SALT_ROUNDS);
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: dados,
    include: includeRoles,
  });
  return formatUsuario(usuario);
};

const remover = async (id) => {
  await buscarPorId(id);
  await prisma.usuario.delete({ where: { id } });
};

const atribuirRole = async (usuarioId, roleId) => {
  await buscarPorId(usuarioId);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError('Role não encontrada.', 404);

  await prisma.usuarioRole.upsert({
    where: { usuarioId_roleId: { usuarioId, roleId } },
    create: { usuarioId, roleId },
    update: {},
  });

  return buscarPorId(usuarioId);
};

const removerRole = async (usuarioId, roleId) => {
  await buscarPorId(usuarioId);
  await prisma.usuarioRole.delete({
    where: { usuarioId_roleId: { usuarioId, roleId } },
  });
  return buscarPorId(usuarioId);
};

// ─── Gerenciamento de continuações ───────────────────────────────────────────

const listarContinuacoes = async (usuarioId) => {
  await buscarPorId(usuarioId);
  return prisma.usuarioContinuacao.findMany({
    where: { usuarioId },
    include: { continuacao: { select: { id: true, nome: true, descricao: true } } },
  });
};

const atribuirContinuacao = async (usuarioId, continuacaoId) => {
  await buscarPorId(usuarioId);
  const cont = await prisma.continuacao.findUnique({ where: { id: continuacaoId } });
  if (!cont) throw new AppError('Continuação não encontrada.', 404);

  await prisma.usuarioContinuacao.upsert({
    where: { usuarioId_continuacaoId: { usuarioId, continuacaoId } },
    create: { usuarioId, continuacaoId },
    update: {},
  });

  return listarContinuacoes(usuarioId);
};

const removerContinuacao = async (usuarioId, continuacaoId) => {
  await buscarPorId(usuarioId);
  await prisma.usuarioContinuacao.delete({
    where: { usuarioId_continuacaoId: { usuarioId, continuacaoId } },
  });
  return listarContinuacoes(usuarioId);
};

module.exports = { listar, buscarPorId, criar, atualizar, remover, atribuirRole, removerRole, listarContinuacoes, atribuirContinuacao, removerContinuacao };
