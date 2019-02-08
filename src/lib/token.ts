import jwt, { SignOptions } from 'jsonwebtoken';

const { SECRET_KEY } = process.env;

if (!SECRET_KEY) {
  const error = new Error('InvalidSecretKeyError');
  error.message = 'Secret key for JWT is missing.';
  throw error;
}

export const generateToken = (payload: any, options: SignOptions): Promise<string> => {
  const jwtOptions: SignOptions = {
    issuer: 'velog.io',
    expiresIn: '7d',
    ...options
  };
  if (!jwtOptions.expiresIn) {
    delete jwtOptions.expiresIn;
  }
  return new Promise((resolve, reject) => {
    jwt.sign(payload, SECRET_KEY, jwtOptions, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
};

export const decodeToken = <T = any>(token: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) reject(err);
      resolve(decoded as any);
    });
  });
};
