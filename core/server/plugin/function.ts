

import {env, _env, global, logger} from "../env.ts"
import {waitfor} from "./utils.ts"
import {authenticate } from "../auth/authn.ts"
import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';

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

async function _addInit(path, imports, env, waitforurl) {
	if(waitforurl)
		await waitfor(waitforurl);
	_callInit(`${path}`, imports, env);
}

export async function addFunctionPlugin(app, value, dir) {
    if(value.init) {
        for(const r of value.init) {
            if(r.function) {
                logger.log(`add init fn @ ${dir}${r.function}`)
                const myenv = Object.assign({}, env.SERVICE_ENV["_shared"], env.SERVICE_ENV[r.env])
                //console.log(Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]))
                //console.log(Object.keys(myenv).map((k) => [k, JSON.stringify(myenv[k])]))

                _addInit(`${dir}${r.function}`,
                    r.imports?  `${dir}${r.imports}` : null,
                    r.env? Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]) : null,
                    r.waitfor); //Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])
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
}