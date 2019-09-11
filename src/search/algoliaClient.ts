import algoliasearch from 'algoliasearch';

const { ALGOLIA_APP_ID, ALGOLIA_API_KEY } = process.env;
if (!ALGOLIA_API_KEY || !ALGOLIA_APP_ID) {
  throw new Error('ALGOLIA ENVVAR IS MISSING');
}
const algoliaClient = algoliasearch(ALGOLIA_APP_ID!, ALGOLIA_API_KEY!);
export default algoliaClient;
