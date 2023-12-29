import Axios, { AxiosResponse } from 'axios';

const { API_V3_HOST } = process.env;

if (!API_V3_HOST) {
  throw new Error('API_V3_HOST ENV is required');
}

const adService = {
  async getBannerTypeAdList(writerUsername: string) {
    const GET_AD_LIST = `
    query ads {
      ads(input: {writer_username: "${writerUsername}", limit: 2, type: "banner" }) {
        id
        title
        body
        image
        url
      }
    }
    `;

    const endpoint =
      process.env.NODE_ENV === 'development'
        ? `http://${API_V3_HOST}/graphql`
        : `https://${API_V3_HOST}/graphql`;

    const { data } = await Axios.post<AxiosResponse<GetAdListResponse>>(
      endpoint,
      {
        operationName: 'ads',
        query: GET_AD_LIST,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return data.data.ads;
  },
};

export default adService;

type GetAdListResponse = {
  ads: {
    id: string;
    type: string;
    url: string;
    start_date: Date;
    end_date: Date;
    title: string;
    body: string;
    image: string;
  };
};
