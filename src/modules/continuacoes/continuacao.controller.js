const service = require('./continuacao.service');

const listar = async (req, res) => res.json(await service.listar(req.usuario));
const listarTodas = async (_req, res) => res.json(await service.listarTodas());
const buscar = async (req, res) => res.json(await service.buscarPorId(req.params.id, req.usuario));
const criar = async (req, res) => res.status(201).json(await service.criar(req.body));
const atualizar = async (req, res) => res.json(await service.atualizar(req.params.id, req.body));
const remover = async (req, res) => {
  await service.remover(req.params.id);
  res.status(204).send();
};

module.exports = { listar, listarTodas, buscar, criar, atualizar, remover };
