import tmp from 'tmp';
import shortid from 'shortid';
import axios from 'axios';
import mimeTypes from 'mime-types';
import fs from 'fs';

export default async function downloadFile(url: string) {
  const response = await axios.get(encodeURI(url), {
    responseType: 'stream'
  });
  const contentType = response.headers['content-type'];
  const extension = mimeTypes.extension(contentType);

  const tmpObject = tmp.fileSync();
  const writeStream = fs.createWriteStream(tmpObject.name);
  response.data.pipe(writeStream);

  await new Promise(resolve => {
    writeStream.on('finish', () => {
      resolve();
    });
  });

  const stream = fs.createReadStream(tmpObject.name);
  const stats = fs.statSync(tmpObject.name);
  return {
    stream,
    extension,
    contentType,
    stats
  };
}
