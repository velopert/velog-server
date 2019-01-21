import serverless from 'serverless-http';
import { APIGatewayProxyHandler } from 'aws-lambda';
import app from './app';

const serverlessApp = serverless(app);
export const handler: APIGatewayProxyHandler = async (event, context) => {
  return await serverlessApp(event, context);
};
