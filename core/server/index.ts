//import { runScript } from 'https://cdn.jsdelivr.net/npm/bebo@0.0.6/lib/bebo_core.js'
//await runScript("./src/main.cljs");
// @ts-ignore
import { Hono, adapter } from "jsr:@hono/hono";

import {env, _env} from "./env.ts"
import {addPortalRoute} from "./standalone.ts"
import {createAuthc, AuthcType } from "./auth/Authc.ts"
import { exchangeToken } from "./auth/token-handler.ts"
import { addSub} from "./auth/addSubtoReq.ts"
import {addPluginsDev} from "./plugin/plugin.ts"
import { pgevents } from "./plugin/db.ts";


const authType = env.GATEWAY_IDP_AUTH_TYPE as AuthcType

let logger = {log: (c) => typeof(c) == "string" ? console.log(`🦖 ${c}`) : console.log(c), error: (c) => console.error(c)};

logger.log('TREX starting');
  
const app = new Hono();
const authc = createAuthc(app)

const headers = new Headers({
	'Content-Type': 'application/json',
});
 

app.get('/_internal/health', () => {
		return new Response(
		JSON.stringify({ 'message': 'ok' }),
		{
			status: 200,
			headers,
		}) 
	}
);
app.use("*", async (c, n) => {logger.log(`🚀REQUEST🚀 ${c.req.url}`); authc.authenticate(authType); addSub(c); await n(); });

app.get('/_internal/metric', async () => { 
	const e = await EdgeRuntime.getRuntimeMetrics();
	return Response.json(e);
});

addPortalRoute(app);

app.post('/oauth/token', async (c) => {
	logger.log('Exchange code with oauth token')
  
	const params = new URLSearchParams()

	const b = await c.req.formData();
	

	for (const [key, value] of b.entries()) {
		params.append(key, value)
	}
	try {
	  const token = await exchangeToken(params)
	  return c.json(token)
	} catch (error) {
	  logger.error(`Error when exchanging code with token: ${error}`)
	  return c.status(500)
	}
  })

logger.log("Add plugins");
if(env.NODE_ENV === 'development') {
	await addPluginsDev(app);
} else {

} 
try {
 pgevents('my-app-pub','myappslot',env.REP_PG)
} catch (e) {

}
logger.log("Added plugins");
logger.log('TREX started');

//logger.log(Deno.env.toObject());   
const options = {
	port: 33000,
	cert: env.TLS__INTERNAL__CRT,
	key: env.TLS__INTERNAL__KEY
  }; 
  //logger.log( nestjs)     
 Deno.serve(options,app.fetch);
