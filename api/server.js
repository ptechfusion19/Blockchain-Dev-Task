const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');

// safe chalk import for CJS/ESM interop
let chalkImport;
try {
  chalkImport = require('chalk');
} catch (e) {
  chalkImport = null;
}
const chalk = (
  chalkImport && typeof chalkImport === 'function' ? chalkImport
  : chalkImport && chalkImport.default && typeof chalkImport.default === 'function' ? chalkImport.default
  : chalkImport && typeof chalkImport.green === 'function' ? chalkImport
  : chalkImport && chalkImport.default && typeof chalkImport.default.green === 'function' ? chalkImport.default
  : {
      red: (s) => String(s),
      green: (s) => String(s),
      yellow: (s) => String(s),
      blue: (s) => String(s),
      gray: (s) => String(s),
    }
);

require('dotenv').config();
const config = require('../src/config');

const buyRoute = require('./routes/buy');
const sellRoute = require('./routes/sell');

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/', (req, res) => res.json({ ok: true, msg: '0x Swap API', chainId: config.CHAIN_ID }));

// mount routes
app.use('/buy', buyRoute);
app.use('/sell', sellRoute);

// error handler
app.use((err, req, res, next) => {
  console.error(chalk.red('API error:'), err && (err.stack || err.message || err));
  res.status(500).json({ error: err && err.message ? err.message : 'internal error' });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(chalk.green(`Swap API running on http://localhost:${PORT} (chainId=${config.CHAIN_ID})`)));
