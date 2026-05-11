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

const serieTemporal = async (req, res, next) => {
  try {
    const { dataInicio, dataFim } = req.query;
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
    }
    const data = await service.serieTemporal({ dataInicio, dataFim }, req.usuario);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { resumoContinuacao, aniversariantes, faltasNoPeriodo, serieTemporal };
