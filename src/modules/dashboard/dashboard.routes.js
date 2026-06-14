const { Router } = require('express');
const controller = require('./dashboard.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');

const router = Router();

router.use(auth);
router.use(perm('visualizar_dashboard'));

// GET /api/dashboard/resumos?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
router.get('/resumos', controller.resumosGeral);

// GET /api/dashboard/continuacao/:continuacaoId?mes=YYYY-MM&trimestre=1|2|3|4
router.get('/continuacao/:continuacaoId', controller.resumoContinuacao);

// GET /api/dashboard/aniversariantes?mes=1-12&continuacaoId=...
router.get('/aniversariantes', controller.aniversariantes);

// GET /api/dashboard/faltas-consecutivas?continuacaoId=...&minFaltas=2
// Retorna crianças com N faltas em sequência a partir da última presença lançada.
// Sai do alerta automaticamente quando a criança comparece na reunião seguinte.
router.get('/faltas-consecutivas', controller.faltasNoPeriodo);

// GET /api/dashboard/serie-temporal?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
router.get('/serie-temporal', controller.serieTemporal);

module.exports = router;
