const service = require('./dashboard.service');

const resumoContinuacao = async (req, res) => {
  const data = await service.resumoContinuacao(req.params.continuacaoId, req.query, req.usuario);
  res.json(data);
};

const aniversariantes = async (req, res) => {
  const data = await service.aniversariantesMes(req.query, req.usuario);
  res.json(data);
};

const faltasNoPeriodo = async (req, res) => {
  const data = await service.faltasNoPeriodo(req.query, req.usuario);
  res.json(data);
};

module.exports = { resumoContinuacao, aniversariantes, faltasNoPeriodo };
