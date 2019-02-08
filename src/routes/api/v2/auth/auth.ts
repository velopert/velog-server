import Router from 'koa-router';
import Joi from 'joi';
import social from './social';
import { getRepository } from 'typeorm';
import { validateBody } from '../../../../lib/utils';
import User from '../../../../entity/User';
import EmailAuth from '../../../../entity/EmailAuth';
import shortid = require('shortid');
import { createAuthEmail } from '../../../../etc/emailTemplates';
import sendMail from '../../../../lib/sendMail';
import { generateToken } from '../../../../lib/token';

const auth = new Router();

/* LOCAL AUTH */

/*
  POST /api/v2/auth/send-auth-email
  {
    email: "public.velopert@gmail.com"
  }
*/
auth.post('/send-auth-email', async ctx => {
  type RequestBody = {
    email: string;
  };
  const schema = Joi.object().keys({
    email: Joi.string()
      .email()
      .required()
  });
  if (!validateBody(ctx, schema)) return false;

  const { email }: RequestBody = ctx.request.body;

  // find user by email
  try {
    const user = await getRepository(User).findOne({
      email
    });
    // create email
    const emailAuth = new EmailAuth();
    emailAuth.code = shortid.generate();
    emailAuth.email = email;
    await getRepository(EmailAuth).save(emailAuth);
    const emailTemplate = createAuthEmail(!!user, emailAuth.code);

    // send email
    await sendMail({
      to: email,
      ...emailTemplate,
      from: 'verify@velog.io'
    });
    ctx.body = {
      registered: !!user
    };
  } catch (e) {
    ctx.throw(500, e);
  }
});
auth.get('/code/:code', async ctx => {
  const { code }: { code: string } = ctx.params;
  try {
    // check code
    const emailAuth = await getRepository(EmailAuth).findOne({
      code
    });
    if (!emailAuth) {
      ctx.status = 404;
      return;
    }

    // check date
    const diff = new Date().getTime() - new Date(emailAuth.created_at).getTime();
    if (diff > 1000 * 60 * 60 * 24) {
      ctx.status = 410;
      ctx.body = {
        name: 'EXPIRED_CODE'
      };
      return;
    }
    const { email } = emailAuth;
    // check user with code
    const user = await getRepository(User).findOne({
      email
    });

    if (!user) {
      // generate register token
      const registerToken = await generateToken(
        {
          email,
          id: emailAuth.id
        },
        { expiresIn: '1h', subject: 'email-register' }
      );

      ctx.body = {
        email,
        register_token: registerToken
      };
    } else {
      // generate user token
    }
  } catch (e) {}
});
auth.post('/code-login', async ctx => {});
auth.post('/register/local', async ctx => {});

/* SOCIAL AUTH */
auth.use('/social', social.routes());

/* GENERAL */
auth.get('/check', async ctx => {});
auth.post('/logout', async ctx => {});
auth.post('/certify', async ctx => {});

export default auth;
