const intervaloPorMes = (anoMes) => {
  const [ano, mes] = anoMes.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0);
  return { inicio, fim };
};

const intervaloPorTrimestre = (trimestre, ano = new Date().getFullYear()) => {
  const t = Number(trimestre);
  const inicio = new Date(ano, (t - 1) * 3, 1);
  const fim = new Date(ano, t * 3, 0);
  return { inicio, fim };
};

/**
 * Resolve intervalo de datas a partir de query params.
 * Suporta: mes=YYYY-MM | trimestre=1-4 | periodo=1m|3m|6m|12m|all
 * Padrão: mês atual.
 * Retorna null quando periodo='all' (sem filtro).
 */
const resolverIntervalo = ({ mes, trimestre, periodo } = {}) => {
  if (mes) return intervaloPorMes(mes);
  if (trimestre) return intervaloPorTrimestre(trimestre);

  const now = new Date();
  if (periodo === 'all') return null;

  if (periodo) {
    const meses = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[periodo];
    if (meses) {
      const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const inicio = new Date(fim);
      inicio.setMonth(inicio.getMonth() - meses);
      return { inicio, fim };
    }
  }

  return intervaloPorMes(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
};

const labelPeriodo = (periodo) => {
  const map = {
    '1m': 'Último mês',
    '3m': 'Últimos 3 meses',
    '6m': 'Últimos 6 meses',
    '12m': 'Últimos 12 meses',
    all: 'Todo o período',
  };
  return map[periodo] ?? 'Mês atual';
};

module.exports = { resolverIntervalo, labelPeriodo };
