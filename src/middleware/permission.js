const AppError = require('../utils/AppError');

/**
 * Middleware de verificação de permissão.
 * ADMIN_GERAL sempre passa; demais verificam permissão específica.
 *
 * @param {string} permissao - nome da permissão exigida
 */
const requirePermissao = (permissao) => (req, _res, next) => {
  if (!req.usuario) {
    throw new AppError('Não autenticado.', 401);
  }

  if (req.usuario.isAdminGeral) {
    return next();
  }

  if (!req.usuario.permissoes.includes(permissao)) {
    throw new AppError(
      `Acesso negado. Permissão necessária: ${permissao}`,
      403
    );
  }

  next();
};

module.exports = requirePermissao;
