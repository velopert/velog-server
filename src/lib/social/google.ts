import { google } from 'googleapis';
import { SocialProfile } from '.';

type GetGoogleAccessTokenParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function getGoogleAccessToken({
  clientId,
  clientSecret,
  code,
  redirectUri
}: GetGoogleAccessTokenParams) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token) throw new Error('Failed to retrieve google access token');
  return tokens.access_token;
}

export async function getGoogleProfile(accessToken: string) {
  const people = google.people('v1');
  const profile = await people.people.get({
    access_token: accessToken,
    resourceName: 'people/me',
    personFields: 'names,emailAddresses,photos'
  });
  const { data } = profile;
  const socialProfile: SocialProfile = {
    email: data.emailAddresses![0].value || null,
    name: data.names![0].displayName || 'emptyname',
    thumbnail: data.photos![0].url || null,
    uid: data.resourceName!.replace('people/', '')
  };
  return socialProfile;
}
