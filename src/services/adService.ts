import Axios from 'axios';

const { API_V3_HOST } = process.env;

if (!API_V3_HOST) {
  throw new Error('API_V3_HOST ENV is required');
}

const adService = {
  async getBannerTypeAdList(writerUsername: string) {
    const input = {
      writer_username: writerUsername,
    };

    const GET_AD_LIST = `
    query ads {
      ads(input: {writer_username: "${writerUsername}", limit: 2, type: "banner" }) {
        id
        title
        body
        image
        url
        start_date
      }
    }
    `;

    console.log(GET_AD_LIST);

    const endpoint =
      process.env.NODE_ENV === 'development'
        ? `http://${API_V3_HOST}/graphql`
        : `https://${API_V3_HOST}/graphql`;
    try {
      console.log('endpoint', endpoint);

      const res = await Axios.post(endpoint, {
        operationName: 'ads',
        query: GET_AD_LIST,
      });

      console.log(GET_AD_LIST);
    } catch (error) {
      console.log('error', error);
    }

    return [];
  },
};

export default adService;
