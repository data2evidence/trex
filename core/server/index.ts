//import { runScript } from 'https://cdn.jsdelivr.net/npm/bebo@0.0.6/lib/bebo_core.js'
//await runScript("./src/main.cljs");
// @ts-ignore
import { Hono, adapter } from "jsr:@hono/hono";
import { serveStatic } from "jsr:@hono/hono/deno";
import nestjs from 'npm:@nestjs/core@^10.4.1'; 
import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';
import {env, _env} from "./env.ts"
import {addPortalRoute} from "./standalone.ts"
import {createAuthc, AuthcType } from "./auth/Authc.ts"
import { exchangeToken } from "./auth/token-handler.ts"
import { addSub} from "./auth/addSubtoReq.ts"
const authType = env.GATEWAY_IDP_AUTH_TYPE as AuthcType
const BASE_PATH="./plugins"
const PREFECT_POOL = "docker-pool"
const PREFECT_DOCKER_NETWORK = "alp_data";
let logger = {log: (c) => typeof(c) == "string" ? console.log(`🦖 ${c}`) : console.log(c), error: (c) => console.error(c)};

logger.log('TREX started');
  
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
app.use("*", async (c, n) => {logger.log(`🚀🚀🚀REQUEST🚀🚀🚀 ${c.req.url}`); authc.authenticate(authType); addSub(c); await n(); });

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


async function _callWorker (req: any, servicePath: string, imports) {
	const envVarsObj = _env;

	const options = {servicePath: servicePath, memoryLimitMb: 150,
		workerTimeoutMs: 30 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]),
		forceCreate: false, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 100000, cpuTimeHardLimitMs: 200000,
		decoratorType: "typescript_with_metadata" 
	}
	try { 
		logger.log(" "+req.url); 

		const worker = await EdgeRuntime.userWorkers.create(options);

		const controller = new AbortController();

		const signal = controller.signal;
		return await worker.fetch(req, { signal });
	} catch (e) {
		logger.error(e);

		if (e instanceof Deno.errors.WorkerRequestCancelled) {
			headers.append('Connection', 'close');			
		}

		const error = { msg: e.toString() };
		return new Response(
			JSON.stringify(error),
			{
				status: STATUS_CODE.InternalServerError,
				headers,
			},
		);
	}
};

function _addFunction(url, path, imports) {
	app.all(url+"/*", (c) =>  _callWorker(c.req.raw, `${path}`, imports));
}


function _addService(url, service, rmsrc) {
	const service_url = env.SERVICE_ROUTES[service];
	//const client = Deno.createHttpClient({ caCerts: [ env.TLS__INTERNAL__CA_CRT ] });
	app.all(url+"/*", async (c) => {
		//console.log(c); 
		const path = rmsrc? c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/').replace(url,'') : c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/');
		const res = await fetch(`${service_url}${path}`, {headers: c.req.raw.headers, body: c.req.body})
		//console.log(res);
		return res;
	});
}

function _addStatic(url, path) {
	logger.log(url + "   " + path);
	app.use(url+"/*", serveStatic({root: path, 
		rewriteRequestPath: (path) => {if(path == "/portal/login-callback") return ""; else return path.replace(new RegExp(`^${url}`), '')}, 
		onNotFound: (path, c) => {
			logger.log(`${path} is not found, you access ${c.req.path}`);
		}
	}));
}

async function  _addPlugin(dir) {
	try {
	const pkg = JSON.parse(await Deno.readTextFile(`${dir}/package.json`));
	switch(pkg.trex.type) {
		case "functions":
			if(pkg.trex.routes)
				pkg.trex.routes.forEach(r => {
				if(r.function) {
					logger.log(`add fun ${r.source} @ ${dir}${r.function}`)

					_addFunction(r.source, `${dir}${r.function}`, r.imports?  `${dir}${r.imports}` : null);
				} else if (r.service) {  
					logger.log(`add svc ${r.source} @ ${r.service}`)
					_addService(r.source, r.service, r.rmsrc);
				} else {
					logger.error("unknown  route type");
				}
			}); 
			break;
		case "ui":
			if(pkg.trex.routes)
				pkg.trex.routes.forEach(r => {
					_addStatic(`${r.source}`, `${dir}${r.target}/`);
			});
			app.use('/portal/login', serveStatic({path: `${dir}/portal.index.html`}));
			break;
		case "flow2":
			try {
				const dockerimg = pkg.trex.dockerimage;
				if(!env.PRFECT_API_URL) {
					logger.error("Prefect URL not defined: skipping flow plugins");
					break;
				}
				if(pkg.trex.flows)
					pkg.trex.flows.forEach(async f => {
						const res = await fetch(`${env.PRFECT_API_URL}/flows/`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								name: f.name
							})
						});
						if(res.status != 200){
							logger.log(`Error creating flow`);
							logger.log(await res.json());
						} else {
							const jres = await res.json();
							const res2 = await fetch(`${env.PRFECT_API_URL}/deployments/`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								name: f.name,
								flow_id: jres.id,
								work_pool_name: PREFECT_POOL,
								work_queue_name: "default",
								entrypoint: f.entrypoint,
								job_variables: {
									image: dockerimg,
								image_pull_policy: "Never",
								networks: [PREFECT_DOCKER_NETWORK]
								}
								})
							});
							if(res2.status != 200) {
								logger.error(`Error creating deployment`);
								logger.error(await res2.json());
							}
							else
								logger.log(`Add flow ${f.name}`);
						}
				});
			} catch (e) {
				console.log(e);
			}
			break;		  
		default:
			logger.log(`Unknown type: ${pkg.trex.type}`);
	}
	} catch (e) { 
		logger.error(e);
	}
}

async function addPlugins() {
	for await (const plugin of Deno.readDir(`${BASE_PATH}`)) {
		if(plugin.isDirectory)
			logger.log(`Add Plugin ${plugin.name} from ${BASE_PATH}`)
			await _addPlugin(`${BASE_PATH}/${plugin.name}`);
	}
}

logger.log("Add plugins");

await addPlugins();
logger.log("Added plugins");
//logger.log(Deno.env.toObject());   
const options = {
	port: 33000,
	cert: env.TLS__INTERNAL__CRT,
	key: env.TLS__INTERNAL__KEY
  }; 
  //logger.log( nestjs)     
 Deno.serve(options,app.fetch);
