const service = require('./usuario.service');

const listar = async (_req, res) => {
  const data = await service.listar();
  res.json(data);
};

const buscar = async (req, res) => {
  const data = await service.buscarPorId(req.params.id);
  res.json(data);
};

const criar = async (req, res) => {
  const data = await service.criar(req.body);
  res.status(201).json(data);
};

const atualizar = async (req, res) => {
  const data = await service.atualizar(req.params.id, req.body);
  res.json(data);
};

const remover = async (req, res) => {
  await service.remover(req.params.id);
  res.status(204).send();
};

const atribuirRole = async (req, res) => {
  const data = await service.atribuirRole(req.params.id, req.body.roleId, req.usuario);
  res.json(data);
};

const removerRole = async (req, res) => {
  const data = await service.removerRole(req.params.id, req.params.roleId);
  res.json(data);
};

const listarContinuacoes = async (req, res) => {
  const data = await service.listarContinuacoes(req.params.id);
  res.json(data);
};

const atribuirContinuacao = async (req, res) => {
  const data = await service.atribuirContinuacao(req.params.id, req.body.continuacaoId);
  res.json(data);
};

const removerContinuacao = async (req, res) => {
  const data = await service.removerContinuacao(req.params.id, req.params.continuacaoId);
  res.json(data);
};

module.exports = { listar, buscar, criar, atualizar, remover, atribuirRole, removerRole, listarContinuacoes, atribuirContinuacao, removerContinuacao };
