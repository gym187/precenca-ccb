const { verify } = require('../config/jwt');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

const auth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Token de autenticação não fornecido.', 401);
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verify(token);
  } catch {
    throw new AppError('Token inválido ou expirado.', 401);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: decoded.id },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissoes: {
                include: { permissao: true },
              },
            },
          },
        },
      },
      continuacoes: {
        select: { continuacaoId: true },
      },
    },
  });

  if (!usuario) {
    throw new AppError('Usuário não encontrado.', 401);
  }

  // Flatten roles e permissões para acesso rápido
  const roles = usuario.roles.map((ur) => ur.role.nome);
  const permissoes = [
    ...new Set(
      usuario.roles.flatMap((ur) =>
        ur.role.permissoes.map((rp) => rp.permissao.nome)
      )
    ),
  ];

  const isAdminGeral = roles.includes('ADMIN_GERAL');
  // IDs das continuações que o usuário tem acesso explícito
  const continuacoes = usuario.continuacoes.map((uc) => uc.continuacaoId);

  req.usuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    roles,
    permissoes,
    isAdminGeral,
    // todasContinuacoes: admin vê tudo; demais só as atribuídas
    todasContinuacoes: isAdminGeral,
    continuacoes,
  };

  next();
};

module.exports = auth;
