
import { serveStatic } from "jsr:@hono/hono/deno";
import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';
const PREFECT_POOL = "docker-pool"
const PREFECT_DOCKER_NETWORK = "alp_data";
import {env, _env} from "../env.ts"
let logger = {log: (c) => typeof(c) == "string" ? console.log(`🦖 ${c}`) : console.log(c), error: (c) => console.error(c)};

const headers = new Headers({
	'Content-Type': 'application/json',
});

async function _callInit (servicePath: string, imports) {
	const envVarsObj = _env;

	const options = {servicePath: servicePath, memoryLimitMb: 150,
		workerTimeoutMs: 30 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]),
		forceCreate: false, netAccessDisabled: false, 
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

function _addFunction(app, url, path, imports) {
	app.all(url+"/*", (c) =>  _callWorker(c.req.raw, `${path}`, imports));
}


function _addService(app, url, service, rmsrc) {
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

function _addStatic(app, url, path) {
	logger.log(url + "   " + path);
	app.use(url+"/*", serveStatic({root: path, 
		rewriteRequestPath: (path) => {if(path == "/portal/login-callback") return ""; else return path.replace(new RegExp(`^${url}`), '')}, 
		onNotFound: (path, c) => {
			logger.log(`${path} is not found, you access ${c.req.path}`);
		}
	}));
}

function _addInit(path, imports) {
	_callInit(`${path}`, imports);
}

async function  _addPlugin(app, dir, pkg) {
	try {
	
	for (const [key, value] of Object.entries(pkg.trex)) {
	switch(key) {
		case "functions":
			if(value.init) {
				value.init.forEach(r => {
					if(r.function) {
						logger.log(`add init fn @ ${dir}${r.function}`)
						_addInit(`${dir}${r.function}`, r.imports?  `${dir}${r.imports}` : null);
					}
				});
			}
			if(value.api)
				value.api.forEach(r => {
				if(r.function) {
					logger.log(`add fn ${r.source} @ ${dir}${r.function}`)

					_addFunction(app, r.source, `${dir}${r.function}`, r.imports?  `${dir}${r.imports}` : null);
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
			break;
		case "flow2":
			try {
				const dockerimg = value.dockerimage;
				if(!env.PRFECT_API_URL) {
					logger.error("Prefect URL not defined: skipping flow plugins");
					break;
				}
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