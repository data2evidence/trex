import {env, global, logger} from "../env.ts"
import {waitfor} from "./utils.ts"
import { authn } from "../auth/authn.ts"
import { authz } from "../auth/authz.ts";
import path from 'node:path'
import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';

const headers = new Headers({
	'Content-Type': 'application/json',
});

function _forumulateNewImportPath(importPath: string) {
	const pathArr = importPath.split(path.sep);
	pathArr.pop() //Remove the filename from path
	const newPath = path.join(pathArr.join(path.sep), ".generated_import.json")
	logger.log(`New Path ${newPath}`)
	return newPath
}

function _fetchLibPkgJson(sourcePath: string, dependencyPath: string) {
	const sourcePathArr = sourcePath.split(path.sep);
	sourcePathArr.pop() //Remove the filename / package.json from path
	const dependencyPathArr = dependencyPath.split(path.sep);
	dependencyPathArr.pop() //Remove the filename / index.ts from path
	dependencyPathArr.pop() //Remove the src folder from path
	const newPath = path.join(dependencyPathArr.join(path.sep), "package.json")
	logger.log(`Dependency Lib Path package.json source: ${sourcePath} dependency: ${dependencyPath} new: ${sourcePathArr.join(path.sep)}${path.sep}${newPath}`)
	return `${sourcePathArr.join(path.sep)}${path.sep}${newPath}`
}

async function _populateNPMDependencies(importPath: string) {
	logger.log(`Import path ${importPath}`)
	const packageObj = JSON.parse(await Deno.readTextFile(importPath));
	const dependencies = packageObj["dependencies"];
	let denoImports = packageObj["imports"] ?? {}; //Since imports and dependencies are combined into the same file
	for(const dependency in dependencies) {
		if (dependency.indexOf("@alp/") === -1) { //Exclude alp packages
			//Overwrite if exists && Ex: "axios" : "npm:axios@x.x.x"
			denoImports[dependency] = `npm:${dependency}@${dependencies[dependency]}`
		} else {
			// For @alp packages fetch the source npm packages
			logger.log(`Dependency Lib Path package.json dependencyPath: ${denoImports[dependency]} dependency: ${dependency}`)
			const libPkgJsonPath = _fetchLibPkgJson(importPath, denoImports[dependency])
			logger.log(`Lib pkg json path ${libPkgJsonPath}`)
			const nestedDenoImports = await _populateNPMDependencies(libPkgJsonPath)
			denoImports = { ...nestedDenoImports, ...denoImports }; //denoImports takes precedence
		}
	}
	return denoImports
}

async function _populateImportMapsFromNPMDependencies(importPath: string) {
	const packageObj = JSON.parse(await Deno.readTextFile(importPath));
	let newImportPath = importPath;
	if(packageObj.hasOwnProperty("dependencies")) { //Check if exists
		logger.log(`Merging npm dependencies into import map for ${importPath}`)
		const denoImports = { "imports": await _populateNPMDependencies(importPath) } //Move as nested property
		newImportPath = _forumulateNewImportPath(importPath)
		await Deno.writeFile(newImportPath, new TextEncoder().encode(JSON.stringify(denoImports, null, 3)));  // overwrite or create it
	}
	return newImportPath;
}

async function _callInit (servicePath: string, imports, fnEnv) {
	imports = await _populateImportMapsFromNPMDependencies(imports)
	const myenv = Object.assign({}, env.SERVICE_ENV["_shared"], env.SERVICE_ENV[fnEnv])
	const _myenv =  Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]);
	const watch = env.WATCH[fnEnv] || false; 
	const options = {servicePath: servicePath, memoryLimitMb: 150,
		workerTimeoutMs: 1 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: _myenv,
		forceCreate: env._FORCE_CREATE || watch, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 100000, cpuTimeHardLimitMs: 200000,
		decoratorType: "typescript_with_metadata" 
	}
	try { 
		const worker = await Trex.userWorkers.create(options);
	} catch (e) {
		logger.error(e);

		if (e instanceof Deno.errors.WorkerRequestCancelled) {
			headers.append('Connection', 'close');			
		}
		const error = { msg: e.toString() };
	}
	return;
}
    
async function _callWorker (req: any, servicePath: string, imports, fncfg) {
	imports = await _populateImportMapsFromNPMDependencies(imports)
	const myenv = Object.assign({}, env.SERVICE_ENV["_shared"], env.SERVICE_ENV[fncfg.env], {DB_CREDENTIALS__PRIVATE_KEY: env.DB_CREDENTIALS__PRIVATE_KEY})
	const _myenv = Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]);
	const watch = env.WATCH[fncfg.env] || false; 

	const options = {servicePath: servicePath, memoryLimitMb: 1000,
		workerTimeoutMs: env.WATCH[fncfg.env] ? 1 * 60 * 1000 : 30 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: _myenv,
		forceCreate: env._FORCE_CREATE || watch, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 100000, cpuTimeHardLimitMs: 200000,
		decoratorType: "typescript_with_metadata" 
	}
	try { 
		const worker = await Trex.userWorkers.create(options);

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

function _addFunction(app, url, path, imports, fncfg) {
	app.all(url+"/*", authn, authz, (c) =>  _callWorker(c.req.raw, `${path}`, imports, fncfg));
}


function _addService(app, url, service, rmsrc) {
	const service_url = env.SERVICE_ROUTES[service];
	app.all(url+"/*", authn, authz, async (c) => {
		let newHeaders = new Headers(c.req.raw.headers)
		newHeaders.append('x-source-origin', env.GATEWAY_WO_PROTOCOL_FQDN)
		const path = rmsrc? c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/').replace(url,'') : c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/');
		let req = {headers: newHeaders, method: c.req.method, body: c.req.raw.body};
		const res = await fetch(`${service_url}${path}`,req )
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
                _addInit(`${dir}${r.function}`,
                    r.imports?  `${dir}${r.imports}` : null,
                    r.env,
                    r.waitfor); //Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])
                if (r.delay) await new Promise(resolve => setTimeout(resolve, r.delay));
                logger.log(`add init fn done @ ${dir}${r.function}`)

            }
        }
    }
    if(value.roles) {
        for(const [name, cfg] of Object.entries(value.roles)) {
			let _name;
			if(name === "IDP_ALP_SVC_CLIENT_ID")
				_name = env.IDP_ALP_SVC_CLIENT_ID;
			else if(name === "IDP_ALP_DATA_CLIENT_ID")
				_name = env.IDP_DATA_SVC_CLIENT_ID;
			else
				_name = name
			if(global.ROLE_SCOPES[_name]) 
				global.ROLE_SCOPES[_name]= global.ROLE_SCOPES[_name].concat(cfg).filter((v, i, self) => self.lastIndexOf(v) == i);
			else 
            	global.ROLE_SCOPES[_name] = cfg;
        }

    }
    if(value.scopes) {
        global.REQUIRED_URL_SCOPES = global.REQUIRED_URL_SCOPES.concat(value.scopes)
    }
    
    if(value.api)
        value.api.forEach(r => {
        if(r.function) {
            logger.log(`add fn ${r.source} @ ${dir}${r.function}`)
            _addFunction(app, r.source, `${dir}${r.function}`, 
            r.imports?  `${dir}${r.imports}` : null, 
            r);
        } else if (r.service) {  
            logger.log(`add svc ${r.source} @ ${r.service}`)
            _addService(app, r.source, r.service, r.rmsrc);
        } else {
            logger.error("unknown  route type");
        }
    }); 
}