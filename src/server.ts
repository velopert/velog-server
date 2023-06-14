import 'reflect-metadata';
import './env';
import app from './app';
import Database from './database';
import { startClosing } from './lib/middlewares/keepAlive';

const { PORT } = process.env;

const database = new Database();

database.getConnection().then(database => {
  app.listen(PORT, () => {
    process.send?.('ready');
    console.log(`server is running on port ${PORT}`);
  });

  process.on('SIGINT', function () {
    startClosing();
    process.exit(0);
  });
});
