/**
 * Middleware de validação com Zod.
 * Lança ZodError que sera capturado pelo errorHandler global.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  schema.parse(req[source]);
  next();
};

module.exports = validate;
