import axios from 'axios';
import FormData from 'form-data';

interface CloudflareUploadResult {
  result: {
    id: string;
    filename: string | null;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  result_info: null;
  success: boolean;
  errors: any[];
  messages: string[];
}

const { CLOUDFLARE_ID, CLOUDFLARE_TOKEN } = process.env;

const cloudflareImages = {
  async upload(buffer: Buffer, filename: string) {
    const cloudflareUploadUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ID}/images/v1`;
    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
    });

    const { data } = await axios.post<CloudflareUploadResult>(cloudflareUploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
        ...formData.getHeaders(),
      },
    });

    return data;
  },
  async delete(imageId: string) {
    const cloudflareUploadUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ID}/images/v1/${imageId}`;

    const { data } = await axios.delete<CloudflareUploadResult>(cloudflareUploadUrl, {
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
      },
    });

    return data;
  },
};

export default cloudflareImages;
