const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const usuarioRoutes = require('./modules/usuarios/usuario.routes');
const roleRoutes = require('./modules/roles/role.routes');
const permissaoRoutes = require('./modules/permissoes/permissao.routes');
const continuacaoRoutes = require('./modules/continuacoes/continuacao.routes');
const criancaRoutes = require('./modules/criancas/crianca.routes');
const presencaRoutes = require('./modules/presencas/presenca.routes');
const transferenciaRoutes = require('./modules/transferencias/transferencia.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const relatorioRoutes = require('./modules/relatorios/relatorio.routes');
const visitaRoutes = require('./modules/visitas/visita.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Segurança e parsing ───────────────────────────────────────────────────
app.use(helmet());
app.use(compression());

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:8080'];
app.use(cors({ origin: corsOrigins }));
app.use(express.json());
app.use(morgan('dev'));

// ─── Arquivos estáticos (uploads) ──────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Rotas ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissoes', permissaoRoutes);
app.use('/api/continuacoes', continuacaoRoutes);
app.use('/api/criancas', criancaRoutes);
app.use('/api/presencas', presencaRoutes);
app.use('/api/transferencias', transferenciaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/visitas', visitaRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// ─── Tratamento global de erros ──────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
