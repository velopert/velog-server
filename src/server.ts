import './env';
import app from './app';
import Database from './database';
import { startClosing } from './lib/middlewares/keepAlive';
import http from 'http';

const { PORT } = process.env;

const database = new Database();
database.getConnection().then(database => {
  const server = http.createServer(app.callback());
  server.listen(PORT, () => {
    process.send?.('ready');
  });

  process.on('SIGINT', function () {
    startClosing();
    server.close(() => {
      process.exit(0);
    });
  });
});
