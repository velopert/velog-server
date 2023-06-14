import nanoid from 'nanoid';
import db from '../lib/db';
import { decodeToken, generateToken } from '../lib/token';
import { SerializedPost } from '../services/postService';
import Axios from 'axios';

const externalInterationService = {
  async createIntegrationCode(userId: string) {
    const code = nanoid();
    await db.externalIntegration.create({
      data: {
        app_identifier: 'codenary',
        code: code,
        fk_user_id: userId,
        is_consumed: false,
      },
    });

    const isIntegrated = await this.checkIntegrated(userId);
    if (!isIntegrated) {
      await this.createIntegrationHistory(userId);
    }

    return code;
  },
  async exchangeToken(code: string) {
    const item = await db.externalIntegration.findUnique({
      where: {
        code,
      },
    });
    if (!item) {
      throw new Error('Invalid code');
    }
    if (item.is_consumed) {
      throw new Error('Code already consumed');
    }
    if (item.created_at < new Date(Date.now() - 1000 * 60 * 15)) {
      throw new Error('Code is expired');
    }
    await db.externalIntegration.update({
      where: {
        id: item.id,
      },
      data: {
        is_consumed: true,
      },
    });
    const integrationToken = await generateToken({
      // using different field name to avoid collision with service's legacy access token
      integrated_user_id: item.fk_user_id,
      type: 'integration',
      app_identifier: 'codenary',
    });

    return integrationToken;
  },
  async checkIntegrated(userId: string) {
    const exists = await db.externalIntegrationHistory.findUnique({
      where: {
        app_identifier_fk_user_id: {
          app_identifier: 'codenary',
          fk_user_id: userId,
        },
      },
    });
    return exists ? true : false;
  },
  async createIntegrationHistory(userId: string) {
    await db.externalIntegrationHistory.create({
      data: {
        app_identifier: 'codenary',
        fk_user_id: userId,
      },
    });
  },
  async decodeIntegrationToken(token: string) {
    const decoded = await decodeToken<IntegrationTokenData>(token);
    if (decoded.type !== 'integration') return null;
    return decoded;
  },
  async notifyWebhook(params: NotifyParams) {
    const webhook = process.env.CODENARY_WEBHOOK;
    if (!webhook) return;
    Axios.post(webhook, params, {
      headers: {
        Authorization: `Token ${process.env.CODENARY_API_KEY}`,
      },
    }).catch(console.error);
  },
};

type IntegrationTokenData = {
  integrated_user_id: string;
  type: 'integration';
  app_identifier: 'codenary';
};

type NotifyParams =
  | {
      type: 'created' | 'updated';
      post: SerializedPost;
    }
  | {
      type: 'deleted';
      post_id: string;
    };

export default externalInterationService;
