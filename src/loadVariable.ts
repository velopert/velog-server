import { SSM, AWSError } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';

type GetParametersPromise = Promise<PromiseResult<SSM.GetParametersByPathResult, AWSError>>;

const ssm = new SSM();
const envPromise: GetParametersPromise | null =
  process.env.NODE_ENV === 'development'
    ? null
    : ssm
        .getParametersByPath({
          Path: '/velog-v2/',
          WithDecryption: true
        })
        .promise();

export default async function loadVariables() {
  if (process.env.NODE_ENV === 'development' || !envPromise) {
    return {
      secretKey: null,
      rdsPassword: null
    };
  }

  try {
    const { Parameters } = await envPromise;
    const selector = (name: string) => {
      return Parameters?.find(param => param.Name?.includes(name))?.Value;
    };

    return {
      secretKey: selector('secret-key'),
      rdsPassword: selector('rds-password')
    };
  } catch (e) {
    console.error('Failed to load variables');
    throw e;
  }
}
