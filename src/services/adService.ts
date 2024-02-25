import Axios, { AxiosResponse } from 'axios';
import { getEndpoint } from '../lib/getEndpoint';

const { API_V3_HOST } = process.env;

if (!API_V3_HOST) {
  throw new Error('API_V3_HOST ENV is required');
}

const adService = {
  async getBannerTypeAdList(writerUsername: string) {
    const GET_AD_LIST = `
    query ads($input: AdsInput!) {
      ads(input: $input) {
        id
        title
        body
        image
        url
      }
    }
    `;

    const variables = {
      input: {
        writer_username: writerUsername,
        limit: 2,
        type: 'banner',
      },
    };

    const endpoint = getEndpoint();
    const { data } = await Axios.post<AxiosResponse<GetAdListResponse>>(
      endpoint,
      {
        operationName: 'ads',
        query: GET_AD_LIST,
        variables,
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
