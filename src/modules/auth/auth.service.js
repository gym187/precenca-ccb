const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { sign } = require('../../config/jwt');
const AppError = require('../../utils/AppError');

const login = async ({ email, password }) => {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }

  const senhaValida = await bcrypt.compare(password, usuario.senha);
  if (!senhaValida) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }

  const token = sign({ id: usuario.id });

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    },
  };
};

module.exports = { login };
