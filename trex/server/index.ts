//import { runScript } from 'https://cdn.jsdelivr.net/npm/bebo@0.0.6/lib/bebo_core.js'
//await runScript("./src/main.cljs");
// @ts-ignore
import { Hono } from "jsr:@hono/hono";
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
	app.all(url, (c) => _callWorker(c.req.raw, `${BASE_PATH}${path}`));
}

function _callService(c,x) {

}

function _addService(url, service) {
	app.all(url, (c) => _callService(c, service));
}

async function  addRoutes() {
	const pkg = JSON.parse(await Deno.readTextFile(`${BASE_PATH}/package.json`));
	if(pkg.trex.routes)
		pkg.trex.routes.forEach(r => {
		if(r.function) {
			_addFunction(r.source, r.function);
		} else if (r.service) {
			_addService(r.source, r.servce);
		} else {
			console.error("unknown route type");
		}
	});
		
}

addRoutes();
Deno.serve(app.fetch);
