import {
  ConnectionManager,
  getConnectionManager,
  Connection,
  ConnectionOptions,
  createConnection
} from 'typeorm';
import entities from './entity';
import loadVariables from './loadVariable';
import 'pg'; // Crucial for postgres

export default class Database {
  connectionManager: ConnectionManager;

  constructor() {
    this.connectionManager = getConnectionManager();
  }

  async getConnection(): Promise<Connection> {
    const CONNECTION_NAME = 'default';

    if (this.connectionManager.has(CONNECTION_NAME)) {
      console.log('Using existing connection...');
      const connection = this.connectionManager.get(CONNECTION_NAME);

      return connection.isConnected ? connection : connection.connect();
    }

    console.log('Creating new connection');

    const variables = await loadVariables();
    const password = process.env.TYPEORM_PASSWORD || variables.rdsPassword;
    if (!password) {
      throw new Error('Failed to load database password');
    }

    const connectionOptions: ConnectionOptions = {
      entities,
      password,
      type: process.env.TYPEORM_CONNECTION as any,
      host: process.env.TYPEORM_HOST,
      database: process.env.TYPEORM_DATABASE,
      username: process.env.TYPEORM_USERNAME,
      port: parseInt(process.env.TYPEORM_PORT || '5432', 10),
      synchronize: process.env.SYNCHRONIZE === 'true'
    };

    return createConnection(connectionOptions);
  }
}
