import marked from 'marked';
import format from 'date-fns/format';
import optimizeImage from '../lib/common';

export const createAuthEmail = (registered: boolean, code: string) => {
  const keywords = registered
    ? {
        type: 'email-login',
        text: '로그인'
      }
    : {
        type: 'register',
        text: '회원가입'
      };

  const subject = `Velog ${keywords.text}`;
  const body = `<a href="https://velog.io"><img src="https://images.velog.io/email-logo.png" style="display: block; width: 128px; margin: 0 auto;"/></a>
  <div style="max-width: 100%; width: 400px; margin: 0 auto; padding: 1rem; text-align: justify; background: #f8f9fa; border: 1px solid #dee2e6; box-sizing: border-box; border-radius: 4px; color: #868e96; margin-top: 0.5rem; box-sizing: border-box;">
    <b style="black">안녕하세요! </b>${keywords.text}을 계속하시려면 하단의 링크를 클릭하세요. 만약에 실수로 요청하셨거나, 본인이 요청하지 않았다면, 이 메일을 무시하세요.
  </div>
  
  <a href="https://velog.io/${keywords.type}?code=${code}" style="text-decoration: none; width: 400px; text-align:center; display:block; margin: 0 auto; margin-top: 1rem; background: #845ef7; padding-top: 1rem; color: white; font-size: 1.25rem; padding-bottom: 1rem; font-weight: 600; border-radius: 4px;">계속하기</a>
  
  <div style="text-align: center; margin-top: 1rem; color: #868e96; font-size: 0.85rem;"><div>위 버튼을 클릭하시거나, 다음 링크를 열으세요: <br/> <a style="color: #b197fc;" href="https://velog.io/${keywords.type}?code=${code}">https://velog.io/${keywords.type}?code=${code}</a></div><br/><div>이 링크는 24시간동안 유효합니다. </div></div>`;

  return {
    subject,
    body
  };
};

type CreateCommentEmailParams = {
  username: string;
  userThumbnail: string | null;
  urlSlug: string;
  unsubscribeToken: string;
  postTitle: string;
  comment: string;
  commentId: string;
};

export const createCommentEmail = ({
  username,
  userThumbnail,
  urlSlug,
  unsubscribeToken,
  postTitle,
  comment,
  commentId
}: CreateCommentEmailParams) => {
  const commentHtml = marked(comment);
  const postLink = `https://velog.io/@${username}/${urlSlug}?comment_id=${commentId}`;
  const unsubscribeUrl = `https://v2.velog.io/api/v2/common/email/unsubscribe?token=${unsubscribeToken}`;

  return `
<a href="https://velog.io"
  ><img
    src="https://images.velog.io/email-logo.png"
    style="display: block; width: 128px; margin: 0 auto; margin-bottom: 1rem;"
/></a>
<div style="max-width: 100%; width: 600px; margin: 0 auto;">
  <div style="font-weight: 400; margin: 0; font-size: 1.25rem; color: #868e96;">
    포스트에 새 댓글이 달렸습니다.
  </div>
  <div style="margin-top: 0.5rem;">
    <a
      href="${postLink}"
      style="color: #495057; text-decoration: none; font-weight: 600; font-size: 1.125rem;"
      >${postTitle}</a
    >
  </div>
  <div style="font-weight: 400; margin-top: 0.5rem; font-size: 1.75rem;"></div>
  <div
    style="width: 100%; height: 1px; background: #e9ecef; margin-top: 2rem; margin-bottom: 2rem;"
  ></div>
  <div style="display:-webkit-flex;display:-ms-flexbox;display:flex;">
    <div>
      <a href="https://velog.io/@${username}">
        <img
          style="height: 64px; width: 64px; display: block; border-radius: 32px;"
          src="${optimizeImage(
            userThumbnail || 'http://img.velog.io/default_user_thumbnail.png',
            120
          )}"
        />
      </a>
    </div>
    <div style="flex: 1; margin-left: 1.5rem; color: #495057;">
      <div style="margin-bottom: 0.5rem;">
        <a
          href="https://velog.io/@${username}"
          style="text-decoration: none; color: #212529; font-weight: 600;"
          >${username}</a
        >
      </div>
      <div style="margin: 0; color: #495057;">
        ${commentHtml}
      </div>
      <div style="font-size: 0.875rem; color: #adb5bd; margin-top: 1.5rem">
        ${format(new Date(), 'yyyy년 MM월 dd일')}
      </div>
      <a
        href="${postLink}?comment_id=${commentId || ''}"
        style="outline: none; border: none; background: #845ef7; color: white; padding-top: 0.5rem; padding-bottom: 0.5rem; font-size: 1rem; font-weight: 600; display: inline-block; background: #845ef7; padding-left: 1rem; padding-right: 1rem; align-items: center; margin-top: 1rem; border-radius: 4px; text-decoration: none;"
        >답글 달기</a
      >
    </div>
  </div>
  <div
    style="width: 100%; height: 1px; background: #e9ecef; margin-top: 4rem; margin-bottom: 1rem;"
  ></div>
  <div style="font-size: 0.875rem; color: #adb5bd; font-style: italic;">
    댓글 알림을 이메일로 수신하는 것을 원하지 않는다면 이
    <a href="${unsubscribeUrl}" style="color: inherit">링크</a>를 눌러주세요.
  </div>
</div>
<div>
  <br />
  <br />
  <br />
  velog | contact@velog.io
</div>
  `;
};
