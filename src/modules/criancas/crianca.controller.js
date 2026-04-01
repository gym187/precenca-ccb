const service = require('./crianca.service');

const listar = async (req, res) => {
  const { continuacaoId, ativo } = req.query;
  res.json(await service.listar({ continuacaoId, ativo, usuario: req.usuario }));
};

const buscar = async (req, res) => res.json(await service.buscarPorId(req.params.id));

const criar = async (req, res) => {
  const dados = req.body;
  if (req.file) dados.foto = `/uploads/fotos/${req.file.filename}`;
  res.status(201).json(await service.criar(dados));
};

const atualizar = async (req, res) => {
  const dados = req.body;
  if (req.file) dados.foto = `/uploads/fotos/${req.file.filename}`;
  res.json(await service.atualizar(req.params.id, dados));
};

const remover = async (req, res) => {
  await service.remover(req.params.id);
  res.status(204).send();
};

const historico = async (req, res) =>
  res.json(await service.buscarHistorico(req.params.id, req.query));

module.exports = { listar, buscar, criar, atualizar, remover, historico };
