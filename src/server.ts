import './env';
import app from './app';
import Database from './database';
import { startClosing } from './lib/middlewares/keepAlive';
import http from 'http';

const { PORT, DATABASE_URL } = process.env;

if (!PORT || !DATABASE_URL) {
  throw new Error('Required environment variables are not set');
}

const database = new Database();
database.getConnection().then(database => {
  app.listen(PORT, () => {
    process.send?.('ready');
    console.info(`Server is listening on ${PORT}`);
    console.info(`Database is connected URL: ${DATABASE_URL.split('@')[1]}`);
  });

  process.on('SIGINT', function () {
    startClosing();
    process.exit(0);
  });
});
