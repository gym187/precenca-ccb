const authService = require('./auth.service');

const login = async (req, res) => {
  const { email, password } = req.body;
  const resultado = await authService.login({ email, password });
  res.json(resultado);
};

const me = async (req, res) => {
  res.json({
    id: req.usuario.id,
    nome: req.usuario.nome,
    email: req.usuario.email,
    roles: req.usuario.roles,
    permissoes: req.usuario.permissoes,
    isAdminGeral: req.usuario.isAdminGeral,
    todasContinuacoes: req.usuario.todasContinuacoes,
    continuacoes: req.usuario.continuacoes,
  });
};

module.exports = { login, me };
