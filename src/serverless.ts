import serverless from 'serverless-http';
import { APIGatewayProxyHandler } from 'aws-lambda';
import 'pg';

import app, { initialize } from './app';

const serverlessApp = serverless(app);

const initialization = initialize();

export const handler: APIGatewayProxyHandler = async (event, context) => {
  await initialization;
  context.callbackWaitsForEmptyEventLoop = false;
  return await serverlessApp(event, context);
};
