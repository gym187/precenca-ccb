const service = require('./crianca.service');

const listar = async (req, res) => {
  const { continuacaoId, ativo } = req.query;
  res.json(await service.listar({ continuacaoId, ativo, usuario: req.usuario }));
};

const buscar = async (req, res) => {
  const crianca = await service.buscarPorId(req.params.id);
  if (req.usuario && !req.usuario.todasContinuacoes && !req.usuario.continuacoes.includes(crianca.continuacaoId))
    return res.status(403).json({ erro: 'Acesso negado.' });
  res.json(crianca);
};

const criar = async (req, res) => {
  const dados = req.body;
  if (req.file) dados.foto = `/uploads/fotos/${req.file.filename}`;
  res.status(201).json(await service.criar(dados));
};

const atualizar = async (req, res) => {
  const dados = req.body;
  if (req.file) dados.foto = `/uploads/fotos/${req.file.filename}`;
  res.json(await service.atualizar(req.params.id, dados, req.usuario));
};

const remover = async (req, res) => {
  await service.remover(req.params.id, req.body, req.usuario);
  res.status(204).send();
};

const historico = async (req, res) =>
  res.json(await service.buscarHistorico(req.params.id, req.query, req.usuario));

const marcarContato = async (req, res) => {
  res.json(await service.marcarContato(req.params.id, req.usuario));
};

module.exports = { listar, buscar, criar, atualizar, remover, historico, marcarContato };
