import AWS from 'aws-sdk';
import sanitize from 'sanitize-html';
import { SendEmailRequest, SendEmailResponse } from 'aws-sdk/clients/ses';

const ses = new AWS.SES({ region: 'us-east-1' });

type EmailParams = {
  to: string | string[];
  subject: string;
  body: string;
  from: string;
};

const sendMail = ({ to, subject, body, from }: EmailParams): Promise<SendEmailResponse> => {
  return new Promise((resolve, reject) => {
    const params: SendEmailRequest = {
      Destination: {
        ToAddresses: typeof to === 'string' ? [to] : to
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: body
          },
          Text: {
            Charset: 'UTF-8',
            Data: sanitize(body, { allowedTags: [] })
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      },
      Source: from
    };
    ses.sendEmail(params, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

export default sendMail;
