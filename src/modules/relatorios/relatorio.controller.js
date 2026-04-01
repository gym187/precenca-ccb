const { gerarPdfContinuacao, gerarPdfGeral, gerarPdfAdministrativo } = require('./relatorio.service');

const continuacao = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { periodo } = req.query;
    await gerarPdfContinuacao(id, { periodo }, req.usuario, res);
  } catch (err) {
    next(err);
  }
};

const geral = async (req, res, next) => {
  try {
    const { periodo } = req.query;
    await gerarPdfGeral({ periodo }, req.usuario, res);
  } catch (err) {
    next(err);
  }
};

const administrativo = async (req, res, next) => {
  try {
    const { periodo } = req.query;
    await gerarPdfAdministrativo({ periodo }, res);
  } catch (err) {
    next(err);
  }
};

module.exports = { continuacao, geral, administrativo };
