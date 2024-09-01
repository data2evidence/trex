
import { serveStatic } from "npm:hono/deno";
import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';
import {authenticate } from "../auth/authn.ts"

import {env, _env, global} from "../env.ts"
let logger = {log: (c) => typeof(c) == "string" ? console.log(`🦖 ${c}`) : console.log(c), error: (c) => console.error(c)};

const headers = new Headers({
	'Content-Type': 'application/json',
});

async function _callInit (servicePath: string, imports, myenv) {
	const envVarsObj = _env;
	//console.log(Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]))
	//console.log(Object.keys(myenv).map((k) => [k, JSON.stringify(myenv[k])]))
	//console.log(myenv);
	const options = {servicePath: servicePath, memoryLimitMb: 150,
		workerTimeoutMs: 1 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: myenv,
		forceCreate: env._FORCE_CREATE, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 100000, cpuTimeHardLimitMs: 200000,
		decoratorType: "typescript_with_metadata" 
	}
	try { 
		//logger.log(" "+req.url); 
		const worker = await EdgeRuntime.userWorkers.create(options);
	} catch (e) {
		logger.error(e);

		if (e instanceof Deno.errors.WorkerRequestCancelled) {
			headers.append('Connection', 'close');			
		}

		const error = { msg: e.toString() };
	}
	return;
}
    
async function _callWorker (req: any, servicePath: string, imports, myenv) {
	//const envVarsObj = _env;
	//console.log(req);

	const options = {servicePath: servicePath, memoryLimitMb: 150,
		workerTimeoutMs: 30 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: myenv,
		forceCreate: env._FORCE_CREATE, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 100000, cpuTimeHardLimitMs: 200000,
		decoratorType: "typescript_with_metadata" 
	}
	try { 
		//logger.log(" "+req.url); 
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

function _addFunction(app, url, path, imports, myenv) {
	app.all(url+"/*", authenticate, (c) =>  _callWorker(c.req.raw, `${path}`, imports, myenv));
}


function _addService(app, url, service, rmsrc) {
	const service_url = env.SERVICE_ROUTES[service];
	//const client = Deno.createHttpClient({ caCerts: [ env.TLS__INTERNAL__CA_CRT ] });
	app.all(url+"/*", authenticate, async (c) => {
		//console.log(c); 
		//console.log(c.req.raw.headers);
		let newHeaders = new Headers(c.req.raw.headers)
		newHeaders.append('x-source-origin', env.GATEWAY_WO_PROTOCOL_FQDN)
		const path = rmsrc? c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/').replace(url,'') : c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/');
		let req = {headers: newHeaders, bode: c.req.body, method: c.req.method};
		if(c.req.body) {
			req["body"] = await c.req.blob()
		}
		const res = await fetch(`${service_url}${path}`,req )
		//console.log(res);
		//console.log(res.status)
		return res;
	});
}

function _addStatic(app, url, path) {
	logger.log(url + "   " + path);
	app.use(url+"/*", serveStatic({root: path, 
		rewriteRequestPath: (path) => {if(path == "/portal/login-callback") return ""; else return path.replace(new RegExp(`^${url}`), '')}, 
		onNotFound: (path, c) => {
			logger.log(`${path} is not found, you access ${c.req.path}`);
		}
	}));
}

async function _waitfor(url) {
	let f = false;
	while(!f) {
		try {
			await fetch(url)
			f = true
		} catch (e) {
			//console.log(e);
			console.log(`${url} not reachable. waiting ...`)
			await new Promise(resolve => setTimeout(resolve, 3000)); 
		}
	}
	return "OK";
}

async function _addInit(path, imports, env, waitfor) {
	if(waitfor)
		await _waitfor(waitfor);
	_callInit(`${path}`, imports, env);
}

async function _addFlow(value) {
	try {
		if(!env.PRFECT_API_URL) {
			logger.error("Prefect URL not defined: skipping flow plugins");
		}
		await _waitfor(env.PREFECT_HEALTH_CHECK);
		const dockerimg = value.dockerimage;
		
		if(value.flows)
			value.flows.forEach(async f => {
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
						work_pool_name: env.PREFECT_POOL,
						work_queue_name: "default",
						entrypoint: f.entrypoint,
						job_variables: {
							image: dockerimg,
						image_pull_policy: "Never",
						networks: [env.PREFECT_DOCKER_NETWORK]
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
}



async function  _addPlugin(app, dir, pkg) {
	try {
	
	for (const [key, value] of Object.entries(pkg.trex)) {
	switch(key) {
		case "functions":
			if(value.init) {
				for(const r of value.init) {
					if(r.function) {
						logger.log(`add init fn @ ${dir}${r.function}`)
						const myenv = Object.assign({}, env.SERVICE_ENV["_shared"], env.SERVICE_ENV[r.env])
						//console.log(Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]))
						//console.log(Object.keys(myenv).map((k) => [k, JSON.stringify(myenv[k])]))

						_addInit(`${dir}${r.function}`, r.imports?  `${dir}${r.imports}` : null, r.env? Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]) : null, r.waitfor); //Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])
						if (r.delay) await new Promise(resolve => setTimeout(resolve, r.delay));
						logger.log(`add init fn done @ ${dir}${r.function}`)

					}
				}
			}
			if(value.roles) {
				for(const [name, cfg] of Object.entries(value.roles)) {
					global.ROLE_SCOPES[name] = cfg;
				}
				//console.log(global.ROLE_SCOPES)

			}
			if(value.scopes) {
				for(const s of value.scopes) {
					global.REQUIRED_URL_SCOPES.push(s);
				}
				//console.log(global.REQUIRED_URL_SCOPES)
			}
			if(value.api)
				value.api.forEach(r => {
				if(r.function) {
					logger.log(`add fn ${r.source} @ ${dir}${r.function}`)
					const myenv = Object.assign({}, env.SERVICE_ENV["_shared"], env.SERVICE_ENV[r.env])
					_addFunction(app, r.source, `${dir}${r.function}`, 
					r.imports?  `${dir}${r.imports}` : null, 
					r.env? Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]) : Object.keys(_env).map((k) => [k, _env[k]]));
				} else if (r.service) {  
					logger.log(`add svc ${r.source} @ ${r.service}`)
					_addService(app, r.source, r.service, r.rmsrc);
				} else {
					logger.error("unknown  route type");
				}
			}); 
			break;
		case "ui":
			if(value.routes)
				value.routes.forEach(r => {
					_addStatic(app, `${r.source}`, `${dir}${r.target}/`);
			});
			app.use('/portal/login', serveStatic({path: `${dir}/portal.index.html`}));
			if(value.uiplugins) {
				global.PLUGINS_JSON = JSON.stringify(value.uiplugins).replace(/\$\$FQDN\$\$/g, env.CADDY__ALP__PUBLIC_FQDN);
			}
			//console.log(global.PLUGINS_JSON);
			break;
		case "flow":
			_addFlow(value);
			break;		  
		default:
			logger.log(`Unknown type: ${key}`);
	}}
	} catch (e) { 
		logger.error(e);
	}
}

export async function addPluginsDev(app) {
	for await (const plugin of Deno.readDir(`${env.BASE_PATH}`)) {
		if(plugin.isDirectory)
			logger.log(`Add Plugin ${plugin.name} from ${env.BASE_PATH}`)
			const pkg = JSON.parse(await Deno.readTextFile(`${env.BASE_PATH}/${plugin.name}/package.json`));
			await _addPlugin(app, `${env.BASE_PATH}/${plugin.name}`, pkg);
	}
}