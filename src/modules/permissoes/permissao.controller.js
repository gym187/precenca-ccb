const service = require('./permissao.service');

const listar = async (_req, res) => res.json(await service.listar());

const criar = async (req, res) => res.status(201).json(await service.criar(req.body));

const remover = async (req, res) => {
  await service.remover(req.params.id);
  res.status(204).send();
};

module.exports = { listar, criar, remover };
