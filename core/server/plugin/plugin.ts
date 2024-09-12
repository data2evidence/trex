
import {addFlowPlugin} from "./flow.ts"
import {env, _env, logger} from "../env.ts"
import {addFunctionPlugin} from "./function.ts"
import {addUIPlugin} from "./ui.ts"
import pg from "npm:pg"



export class Plugins {

	private constructor() {
		const opt = {
			user: env.PG_SUPER_USER,
			password: env.PG_SUPER_PASSWORD,
			host: env.PG__HOST,
			port: parseInt(env.PG__PORT),
			database: env.PG__DB_NAME,
		  }
		this.pgclient = new pg.Client(opt);
		this.initDB();
		
	}

	private async initDB() {
		let res = await this.pgclient.connect();
		//res = await this.pgclient.query("CREATE SCHEMA IF NOT EXISTS trex");
		res = await this.pgclient.query("CREATE TABLE IF NOT EXISTS trex.plugins (id VARCHAR(512) PRIMARY KEY, name VARCHAR(256), url VARCHAR(1024), type VARCHAR(256), payload JSONB, initialized BOOLEAN)");
	}

	private pgclient;
	private static _plugin : Plugins;

	private static get() {
		if(!Plugins._plugin)
			Plugins._plugin = new Plugins();
		return Plugins._plugin;
	}

	static async initPluginsDev(app) {
		for await (const plugin of Deno.readDir(`${env.BASE_PATH}`)) {
			if(plugin.isDirectory)
				logger.log(`Add Plugin ${plugin.name} from ${env.BASE_PATH}`)
				try {
					const pkg = JSON.parse(await Deno.readTextFile(`${env.BASE_PATH}/${plugin.name}/package.json`));
					await Plugins.get().addPlugin(app, `${env.BASE_PATH}/${plugin.name}`, pkg, 'dev');
				} catch(e) {
					logger.error(`${plugin.name} does not have a package.json`)
				}
		}
	}

	static async initPluginsEnv(app) {
		const plugin = Plugins.get();
		let _init : string[] = [] 
		try {
			const pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGIN_PATH}/package.json`));
			if(pkg.dependencies) 
				for(const name of Object.keys(pkg.dependencies)) {
					_init.push(name);
			}
		} catch (e) {

		}
		for(const [name, url] of Object.entries(env.INIT_PLUGINS? env.INIT_PLUGINS: {})) {
			if(_init.indexOf(name) == -1) {
				await Trex.execCmdx("npx", `yarn%add%${url}`, `${env.PLUGIN_PATH}`)
			}
			else 
				logger.log(`skip install ${name} - already installed`)
			try {
				const pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGIN_PATH}/node_modules/${name}/package.json`));
				await plugin.addPlugin(app, `${env.PLUGIN_PATH}/node_modules/${name}`, pkg, url);
			} catch(e) {
				logger.error(`${name} does not have a package.json`)
			}
		}
	}
	

	async addPlugin(app, dir, pkg, url) {
		try {
			for (const [key, value] of Object.entries(pkg.trex)) {
				const q = `INSERT INTO trex.plugins (id, name, url, type, payload, initialized) VALUES ('${key}_${pkg.name}', '${pkg.name}', '${url}','${key}', '${JSON.stringify(value)}', 'false') ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, type = EXCLUDED.type, payload = EXCLUDED.payload, initialized = EXCLUDED.initialized`
				const r = await this.pgclient.query(q);
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
				}
				const q2 = `UPDATE trex.plugins set initialized='true' where "name"='${pkg.name}'`
				const r2 = await this.pgclient.query(q2);
			}
		} catch (e) { 
			logger.error(e);
		}
	}
}



