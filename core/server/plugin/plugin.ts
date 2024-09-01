
import {addFlowPlugin} from "./flow.ts"
import {env, _env, logger} from "../env.ts"
import {addFunctionPlugin} from "./function.ts"
import {addUIPlugin} from "./ui.ts"


async function  _addPlugin(app, dir, pkg) {
	try {
	
	for (const [key, value] of Object.entries(pkg.trex)) {
	switch(key) {
		case "functions":
			addFunctionPlugin(app, value, dir);
			break;
		case "ui":
			addUIPlugin(app, value, dir);
			break;
		case "flow":
			addFlowPlugin(value);
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