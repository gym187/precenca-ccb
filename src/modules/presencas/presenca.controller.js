const service = require('./presenca.service');

const lancarLista = async (req, res) => {
  const resultado = await service.lancarLista(req.body, req.usuario.id, req.usuario);
  res.status(201).json(resultado);
};

const editar = async (req, res) => {
  const data = await service.editar(req.params.id, req.body, req.usuario.id);
  res.json(data);
};

const listar = async (req, res) => {
  const data = await service.listar({ ...req.query, usuario: req.usuario });
  res.json(data);
};

const auditoria = async (req, res) => {
  const data = await service.buscarAuditoria(req.params.id);
  res.json(data);
};

module.exports = { lancarLista, editar, listar, auditoria };
