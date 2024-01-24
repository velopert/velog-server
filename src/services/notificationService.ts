import Cookies from 'cookies';
import { getEndpoint } from '../lib/getEndpoint';
import Axios, { AxiosResponse } from 'axios';

export const notificationService = {
  async notificationCount(cookies: Cookies) {
    const NOTIFICATION_COUNT_QUERY = `
    query NotificationCount {
      notificationCount
    }
    `;

    const endpoint = getEndpoint();
    const accessToken = cookies.get('access_token') ?? '';

    const res = await Axios.post<AxiosResponse<NotificationCountResponse>>(
      endpoint,
      {
        operationName: 'NotificationCount',
        query: NOTIFICATION_COUNT_QUERY,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.data.data.notificationCount;
  },
};

type NotificationCountResponse = {
  notificationCount: number;
};
