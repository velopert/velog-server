import { Client } from '@elastic/elasticsearch';

const { ES_HOST } = process.env;
const esClient = new Client({ node: 'http://localhost:9200' });

export default esClient;
