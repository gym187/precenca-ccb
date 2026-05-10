const { Router } = require('express');
const controller = require('./visita.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');
const validate = require('../../middleware/validate');
const { visitaSchema, editarVisitaSchema } = require('./visita.schema');

const router = Router();
router.use(auth);

// IMPORTANTE: /resumo e /crianca/:id ANTES de /:id para evitar conflito
router.get('/resumo',              perm('gerenciar_visitas'), controller.getResumo);
router.get('/crianca/:criancaId',  perm('gerenciar_visitas'), controller.historicoCrianca);
router.get('/',                    perm('gerenciar_visitas'), controller.listar);
router.post('/',                   perm('gerenciar_visitas'), validate(visitaSchema), controller.criar);
router.put('/:id',                 perm('gerenciar_visitas'), validate(editarVisitaSchema), controller.editar);
router.delete('/:id',              perm('gerenciar_visitas'), controller.remover);

module.exports = router;
