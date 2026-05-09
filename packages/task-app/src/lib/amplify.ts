import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
    }
  },
  API: {
    REST: {
      TaskApi: {
        endpoint: process.env.NEXT_PUBLIC_API_URL || '',
        region: 'ap-northeast-1'
      }
    }
  }
}, { ssr: true });

export const configureAmplify = () => {
};
