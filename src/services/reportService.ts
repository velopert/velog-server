import Axios, { AxiosResponse } from 'axios';
import { getEndpoint } from '../lib/getEndpoint';
import Cookies from 'cookies';

const { API_V3_HOST } = process.env;

if (!API_V3_HOST) {
  throw new Error('API_V3_HOST ENV is required');
}

const reportService = {
  async write(args: WriteReportArgs, cookies: Cookies, ip: string) {
    const WRITE_REPORT_MUTATION = `
      mutation WriteReport($input: WriteReportInput!) {
        writeReport(input: $input) {
          id
        }
      }
    `;

    const endpoint = getEndpoint();
    const accessToken = cookies.get('access_token') ?? '';

    try {
      const res = await Axios.post<AxiosResponse<WriteReportResponse>>(
        endpoint,
        {
          operationName: 'WriteReport',
          query: WRITE_REPORT_MUTATION,
          variables: {
            input: {
              ...args,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
            'X-Forwarded-For': ip,
          },
        }
      );

      return res.data.data.writeReport;
    } catch (error) {
      console.log('write report error', error);
    }
  },
};

export default reportService;

export type WriteReportArgs = {
  type: string;
  target_id: string;
  body: string;
};

type WriteReportResponse = {
  writeReport: {
    id: string;
  };
};
