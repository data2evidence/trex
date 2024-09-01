//import { runScript } from 'https://cdn.jsdelivr.net/npm/bebo@0.0.6/lib/bebo_core.js'
//await runScript("./src/main.cljs");
// @ts-ignore
import { Hono } from "npm:hono";
import { logger as hlogger } from "npm:hono/logger";
//import express from 'npm:express'

import {env, _env} from "./env.ts"
import {addPortalRoute} from "./standalone.ts"
import { exchangeToken } from "./auth/token-handler.ts"
import { addSub} from "./auth/addSubtoReq.ts"
import {addPluginsDev} from "./plugin/plugin.ts"
import { pgevents } from "./plugin/dbfunctions.ts";
import { ensureAuthorized } from "./auth/authz.ts";


const app = new Hono();
app.use(hlogger())

let logger = {log: (c) => console.log(c), error: (c) => console.error(c)};

logger.log('🦖 TREX initializing 🦖');
//const authc = createAuthc(app)

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

app.use("*", async (c, n) => {
	//logger.log(`🚀REQUEST🚀 ${c.req.url}`);
	

	addSub(c);
	//console.log("OK")
	//console.log(c.req.query? c.req.query(): "ok")
	//console.log(c.req.param? c.req.param(): "ok2")
	//console.log(c.req.body? c.req.blob(): "ok2")
	if(true || c.req.raw.url.startsWith('http://localhost:41100/oauth/token') 
		|| c.req.raw.url.startsWith("http://localhost:41100/portal/login-callback")
		|| c.req.raw.url.startsWith("http://localhost:41100/usermgmt/api/user-group/list")
 		|| c.req.raw.url == "http://localhost:41100/portal") {
			console.log("OK")
			console.log(c.req.param)
		} else {
			c.req.raw.headers["host"] ? c.req.raw.headers['x-source-origin'] = env.GATEWAY_WO_PROTOCOL_FQDN : null;
			let x = new Headers(c.req.raw.headers)
			x.append('x-source-origin', env.GATEWAY_WO_PROTOCOL_FQDN)
			let y = {method: c.req.raw.method, headers: x};
			if(c.req.raw.redirect)
				y["redirect"] = c.req.raw.redirect
			if(c.req.body)
				y["body"] = await c.req.blob()
			let r = new Request(c.req.raw.url, y);
			EdgeRuntime.applySupabaseTag(c.req.raw, r);
			console.log(r)
			console.log(c.req.raw)
			c.req.raw = r;
		}
	await n(); 
});
//app.use(async (c, next) => { await ensureAuthorized(c.req.raw, c.res, next); await next() })

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
logger.log('🦖 TREX started 🦖');

//logger.log(Deno.env.toObject());   
const options = {
	port: 33000,
	cert: env.TLS__INTERNAL__CRT,
	key: env.TLS__INTERNAL__KEY
  }; 
  //logger.log( nestjs)     
 Deno.serve(options,app.fetch);
