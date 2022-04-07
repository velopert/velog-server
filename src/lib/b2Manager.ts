import B2 from 'backblaze-b2';

class B2Manager {
  private instance?: B2;
  private lastAuthorization?: Date;

  private get b2() {
    if (!this.instance) {
      const { B2_KEY_ID, B2_KEY, B2_BUCKET_ID } = process.env;
      if (!B2_KEY_ID || !B2_KEY || !B2_BUCKET_ID) {
        throw new Error('B2 environmnet variables are not defined');
      }
      this.instance = new B2({
        applicationKeyId: process.env.B2_KEY_ID ?? '',
        applicationKey: process.env.B2_KEY ?? '',
      });
    }
    return this.instance!;
  }

  async authorize() {
    // authorize every hour
    if (!this.lastAuthorization || Date.now() - this.lastAuthorization.getTime() > 1000 * 60 * 60) {
      console.log('authing');
      await this.b2.authorize();
      this.lastAuthorization = new Date();
    }
    return true;
  }

  public async getUploadUrl() {
    const result = await this.b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });
    type UploadUrlResult = { authorizationToken: string; uploadUrl: string };
    const { authorizationToken, uploadUrl }: UploadUrlResult = result.data;
    return { authorizationToken, uploadUrl };
  }

  public async upload(buffer: Buffer, path: string) {
    await this.authorize();
    const { authorizationToken, uploadUrl } = await this.getUploadUrl();
    const result = await this.b2.uploadFile({
      uploadUrl,
      uploadAuthToken: authorizationToken,
      fileName: path,
      data: buffer,
      axios: {
        timeout: 250000,
      },
    });
    const fileId: string = result.data.fileId;
    return {
      url: `https://velog.velcdn.com/${path}`,
      fileId,
    };
  }

  public async delete(fileId: string, path: string) {
    await this.authorize();
    return this.b2.deleteFileVersion({
      fileId: fileId,
      fileName: path,
    });
  }
}

const b2Manager = new B2Manager();
export default b2Manager;
