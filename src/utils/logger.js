const timestamp = () => new Date().toISOString();

const logger = {
  info: (msg) => console.log(`[${timestamp()}] INFO  ${msg}`),
  warn: (msg) => console.warn(`[${timestamp()}] WARN  ${msg}`),
  error: (msg, err) => {
    console.error(`[${timestamp()}] ERROR ${msg}`);
    if (err) console.error(err);
  },
};

module.exports = logger;
