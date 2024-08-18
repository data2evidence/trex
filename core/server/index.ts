//import { runScript } from 'https://cdn.jsdelivr.net/npm/bebo@0.0.6/lib/bebo_core.js'
//await runScript("./src/main.cljs");
// @ts-ignore
import { Hono, adapter } from "jsr:@hono/hono";
import { serveStatic } from "jsr:@hono/hono/deno";

import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';


const BASE_PATH="./apifun"
console.log('main function started');


const app = new Hono();
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

app.get('/_internal/metric', async () => { 
	const e = await EdgeRuntime.getRuntimeMetrics();
	return Response.json(e);
});

async function _callWorker (req: any, servicePath: string) {
	const options = {servicePath: servicePath, memoryLimitMb: 150,
		workerTimeoutMs: 5 * 60 * 1000, noModuleCache: false,
		importMapPath: null, envVarsObj: Deno.env.toObject(),
		forceCreate: true, netAccessDisabled: false,
		cpuTimeSoftLimitMs: 10000, cpuTimeHardLimitMs: 20000
	}
	try {
		const worker = await EdgeRuntime.userWorkers.create(options);;
		const controller = new AbortController();

		const signal = controller.signal;

		return await worker.fetch(req, { signal });
	} catch (e) {
		console.error(e);

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

function _addFunction(url, path) {
	app.all(url, (c) => _callWorker(c.req.raw, `${path}`));
}

function _callService(c,x) {

}

function _addService(url, service) {
	app.all(url, (c) => _callService(c, service));
}

function _addStatic(url, path) {
	console.log("🦖 "+url + "   " + path);
	app.use(url+"/*", serveStatic({root: path, rewriteRequestPath: (path) =>
		path.replace(new RegExp(`^${url}`), '') }));
}

async function  _addPlugin(dir) {
	const pkg = JSON.parse(await Deno.readTextFile(`${dir}/package.json`));
	switch(pkg.trex.type) {
		case "functions":
			if(pkg.trex.routes)
				pkg.trex.routes.forEach(r => {
				if(r.function) {
					//console.log(`add fun ${r.source}`)
					_addFunction(r.source, `${dir}${r.function}`);
				} else if (r.service) {
					//console.log(`add svc ${r.source}`)
					_addService(r.source, `${dir}${r.servce}`);
				} else {
					console.error("🦖 unknown route type");
				}
			});
			break;
		case "ui":
			if(pkg.trex.routes)
				pkg.trex.routes.forEach(r => {
					_addStatic(`${r.source}`, `${dir}${r.target}/`);
			});
			break;
		default:
			console.log(`🦖 Unknown type: ${pkg.trex.type}`);
	}
}

async function addPlugins() {
	for await (const plugin of Deno.readDir(`${BASE_PATH}`)) {
		if(plugin.isDirectory)
			_addPlugin(`${BASE_PATH}/${plugin.name}`);
	}
}

app.use("/*", async (c, n) => {console.log(`🦖 REQEST ${c.req.url}`); await n(); });
addPlugins();
Deno.serve(app.fetch);
