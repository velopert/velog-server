export const createAuthEmail = (isUser: boolean, code: string) => {
  const keywords = isUser
    ? {
        type: 'email-login',
        text: '로그인'
      }
    : {
        type: 'register',
        text: '회원가입'
      };

  // return {
  //   subject: `Velog ${keywords.text}`,
  //   body:
  // }
};
