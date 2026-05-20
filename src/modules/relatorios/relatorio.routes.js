const router = require('express').Router();
const ctrl = require('./relatorio.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');

const somenteAdmin = (req, res, next) => {
  if (!req.usuario.isAdminGeral)
    return res.status(403).json({ erro: 'Acesso exclusivo de ADMIN_GERAL.' });
  next();
};

router.get('/geral', auth, ctrl.geral);
router.get('/administrativo', auth, somenteAdmin, ctrl.administrativo);
router.get('/continuacao/:id', auth, perm('visualizar_dashboard'), ctrl.continuacao);
router.get('/csv', auth, perm('visualizar_dashboard'), ctrl.csv);

module.exports = router;
