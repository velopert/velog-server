import Axios from 'axios';

export function sendSlackMessage(message: string, customChannel?: string) {
  const slackUrl = `https://hooks.slack.com/services/${customChannel ?? process.env.SLACK_TOKEN}`;
  return Axios.post(slackUrl, {
    text: message,
  });
}
