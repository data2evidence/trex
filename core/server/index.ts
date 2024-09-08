import { Hono } from "npm:hono";
import { logger as hlogger } from "npm:hono/logger";
import {env, _env, logger} from "./env.ts"
import {addPortalRoute} from "./portal-routes.ts"
import { exchangeToken } from "./auth/token-handler.ts"
import {Plugins} from "./plugin/plugin.ts"

//import { pgevents } from "./plugin/dbfunctions.ts";

const app = new Hono();
app.use(hlogger())


logger.log('🦖 TREX initializing 🦖');

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

const getDecodedToken = (req: Request) => {
	const authHeader = req.headers["authorization"]
	if (!authHeader) {
	  return null
	}
	const token = authHeader.replace(/bearer /i, '')
	const decodedToken = jwt.decode(token) as jwt.JwtPayload
  
	return decodedToken
  }

app.use("*", async (c, n) => {
	/*if(c.req.raw.url.startsWith('http://localhost:41100/oauth/token') 
		|| c.req.raw.url.startsWith("http://localhost:41100/portal/login-callback")
		|| c.req.raw.url.startsWith("http://localhost:41100/usermgmt/api/user-group/list")
 		|| c.req.raw.url == "http://localhost:41100/portal") {

		} else {*/
			c.req.raw.headers["host"] ? c.req.raw.headers['x-source-origin'] = env.GATEWAY_WO_PROTOCOL_FQDN : null;
			let x = new Headers(c.req.raw.headers)
			x.append('x-source-origin', env.GATEWAY_WO_PROTOCOL_FQDN)
			//x.append('user', )
			let y = {method: c.req.raw.method, headers: x, redirect: c.req.raw.redirect, body: c.req.raw.body};
			const token = getDecodedToken(c.req.raw);
			if(token && token[getDecodedToken(c.req.raw)] != null) {
				y["user"] = {sub: getDecodedToken(c.req.raw)[env.GATEWAY_IDP_SUBJECT_PROP]};
			}
			let r = new Request(c.req.raw.url, y);
			Trex.applySupabaseTag(c.req.raw, r);
			c.req.raw = r;
		//}
	await n(); 
});

//app.use(ensureAuthorized)

app.get('/_internal/metric', async () => { 
	const e = await Trex.getRuntimeMetrics();
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
	await Plugins.initPluginsDev(app);
} else {
	await Plugins.initPluginsEnv(app);

} 
// try {
//  pgevents('my-app-pub','myappslot',env.REP_PG)
// } catch (e) {
// }

logger.log("Added plugins");
logger.log('🦖 TREX started 🦖');

Deno.serve(app.fetch);
