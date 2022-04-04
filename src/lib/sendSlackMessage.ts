import Axios from 'axios';

const slackUrl = `https://hooks.slack.com/services/${process.env.SLACK_TOKEN}`;

export function sendSlackMessage(message: string, customChannel?: string) {
  return Axios.post(slackUrl, {
    text: message,
  });
}
