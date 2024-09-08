
import { createRemoteJWKSet, jwtVerify } from "npm:jose";
import { Context } from "npm:hono";
import { env, publicURLs, logger } from '../env.ts'

export type AuthcType = 'logto'


const JWKS = createRemoteJWKSet(
  new URL(`${env.LOGTO_ISSUER}/jwks`)
);

export async function authn(c: Context, next: Function) {

  if(publicURLs.indexOf(c.req.path) > -1 ){
    logger.log(`PUBLIC URL ${c.req.path} ${publicURLs.indexOf(c.req.path)} NO AUTHN CHECK`);
  } else {
    let token = "";
    if (
      c.req.header("authorization") &&
      c.req.header("authorization")?.split(" ")[0] === "Bearer"
    ) {
      token = c.req.header("authorization")?.split(" ")[1] || "";
    }
    if (token === null || token.length === 0) {
      logger.error("authenticate: no token found");
      return new Response("Unauthorized", { status: 401 });
    }
    let authError = false;
    await jwtVerify(token, JWKS).catch((err) => {
      logger.error("authenticate: jwt verify failed");
      authError = true;
      logger.error(err);
    });
    if (authError) {
      logger.error("authenticate: error");
      return new Response("Authentication Token not valid", { status: 401 });
    }
    logger.log("authenticate: success");
  }
  await next();
}
