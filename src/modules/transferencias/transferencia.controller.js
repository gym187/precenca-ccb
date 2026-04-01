const service = require('./transferencia.service');

const transferir = async (req, res) => {
  const data = await service.transferir(req.body);
  res.status(201).json(data);
};

const historico = async (req, res) => {
  const data = await service.historicosPorCrianca(req.params.criancaId);
  res.json(data);
};

module.exports = { transferir, historico };
