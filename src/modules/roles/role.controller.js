const service = require('./role.service');

const listar = async (_req, res) => res.json(await service.listar());

const buscar = async (req, res) => res.json(await service.buscarPorId(req.params.id));

const criar = async (req, res) => res.status(201).json(await service.criar(req.body));

const atualizar = async (req, res) => res.json(await service.atualizar(req.params.id, req.body));

const remover = async (req, res) => {
  await service.remover(req.params.id);
  res.status(204).send();
};

const atribuirPermissao = async (req, res) =>
  res.json(await service.atribuirPermissao(req.params.id, req.body.permissaoId));

const removerPermissao = async (req, res) =>
  res.json(await service.removerPermissao(req.params.id, req.params.permissaoId));

module.exports = { listar, buscar, criar, atualizar, remover, atribuirPermissao, removerPermissao };
