const service = require('./visita.service');

const listar = async (req, res) => {
  const data = await service.listar({ ...req.query, usuario: req.usuario });
  res.json(data);
};

const getResumo = async (req, res) => {
  const data = await service.resumo(req.usuario);
  res.json(data);
};

const historicoCrianca = async (req, res) => {
  const data = await service.historicoCrianca(req.params.criancaId, req.usuario);
  res.json(data);
};

const criar = async (req, res) => {
  const data = await service.criar(req.body, req.usuario.id, req.usuario);
  res.status(201).json(data);
};

const editar = async (req, res) => {
  const data = await service.editar(req.params.id, req.body, req.usuario);
  res.json(data);
};

const remover = async (req, res) => {
  await service.remover(req.params.id, req.usuario);
  res.status(204).send();
};

const listarResponsaveis = async (req, res) => {
  const data = await service.listarResponsaveis();
  res.json(data);
};

module.exports = { listar, getResumo, historicoCrianca, criar, editar, remover, listarResponsaveis };
