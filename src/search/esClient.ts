import { Client } from '@elastic/elasticsearch';

const { ES_HOST } = process.env;
const esClient = new Client({ node: process.env.ES_HOST });

export default esClient;
