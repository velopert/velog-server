const querystring = require('querystring'); // Node.js를 실행할 Lambda 머신이 가지고 있기에 별도의 설치를 하지 않습니다.
const AWS = require('aws-sdk'); // Node.js를 실행할 Lambda 머신이 가지고 있기에 별도의 설치를 하지 않습니다.
const S3 = new AWS.S3({
  region: 'ap-northeast-2' // S3 Bucket Region 명
});

const Sharp = require('sharp');
const BUCKET = 's3.images.velog.io'; // S3 Bucket 이름

exports.handler = async (event, context, callback) => {
  const response = event.Records[0].cf.response;
  const request = event.Records[0].cf.request;

  const params = querystring.parse(request.querystring);
  const uri = request.uri;
  const [, imageName, extension] = uri.match(/\/(.*)\.(.*)/);
  const requiredFormat = extension == 'jpg' ? 'jpeg' : extension;

  response.headers['content-type'] = [
    {
      key: 'Content-type',
      value: 'image/' + requiredFormat
    }
  ];

  if (!response.headers['cache-control']) {
    response.headers['cache-control'] = [
      {
        key: 'Cache-Control',
        value: 'public, max-age=86400'
      }
    ];
  }

  if (!params.w && !params.h) {
    callback(null, response);
    return;
  }

  try {
    const originalKey = imageName + '.' + extension;

    const s3Object = await S3.getObject({
      Bucket: BUCKET,
      Key: originalKey
    }).promise();

    let resizedImage;

    if (params.w && params.h) {
      const width = parseInt(params.w);
      const height = parseInt(params.h);
      resizedImage = await Sharp(s3Object.Body)
        .resize(width, height, { fit: 'fill' })
        .withMetadata()
        .rotate()
        .toFormat(requiredFormat)
        .toBuffer();
    } else if (params.w) {
      const width = parseInt(params.w);
      resizedImage = await Sharp(s3Object.Body)
        .resize({ width: width })
        .withMetadata()
        .rotate()
        .toFormat(requiredFormat)
        .toBuffer();
    } else if (params.h) {
      const height = parseInt(params.h);
      resizedImage = await Sharp(s3Object.Body)
        .resize({ height: height })
        .withMetadata()
        .rotate()
        .toFormat(requiredFormat)
        .toBuffer();
    } else {
      return callback(null, response);
    }

    response.status = 200;
    response.body = resizedImage.toString('base64');
    response.bodyEncoding = 'base64';

    return callback(null, response);
  } catch (error) {
    console.log(error);
    return callback(error);
  }
};
