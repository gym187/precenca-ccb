const { ZodError } = require('zod');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Erros de validação Zod
  if (err instanceof ZodError) {
    return res.status(422).json({
      erro: 'Dados inválidos',
      detalhes: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
  }

  // Erros operacionais conhecidos (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message });
  }

  // Erros do Prisma
  if (err.code) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        erro: 'Registro duplicado.',
        campo: err.meta?.target,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ erro: 'Registro não encontrado.' });
    }
  }

  // Erro genérico (não expõe stack em produção)
  logger.error('Erro interno não tratado:', err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
};

module.exports = errorHandler;
