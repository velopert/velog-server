const { API_V3_HOST } = process.env;

if (!API_V3_HOST) {
  throw new Error('API_V3_HOST ENV is required');
}

export function getEndpoint() {
  return process.env.NODE_ENV === 'development'
    ? `http://${API_V3_HOST}/graphql`
    : `https://${API_V3_HOST}/graphql`;
}
