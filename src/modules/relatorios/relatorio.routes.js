const router = require('express').Router();
const ctrl = require('./relatorio.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');

router.get('/geral', auth, ctrl.geral);
router.get('/administrativo', auth, perm('visualizar_dashboard'), ctrl.administrativo);
router.get('/continuacao/:id', auth, perm('visualizar_dashboard'), ctrl.continuacao);
router.get('/csv', auth, perm('visualizar_dashboard'), ctrl.csv);

module.exports = router;
