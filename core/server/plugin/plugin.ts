
import {addFlowPlugin} from "./flow.ts"
import {env, logger} from "../env.ts"
import {addFunctionPlugin} from "./function.ts"
import {addUIPlugin} from "./ui.ts"
import pg from "npm:pg"



export class Plugins {

	private constructor() {
		const opt = {
			user: env.PG__USER,
			password: env.PG__PASSWORD,
			host: env.PG__HOST,
			port: parseInt(env.PG__PORT),
			database: env.PG__DB_NAME,
		  }
		this.pgclient = new pg.Client(opt);
		//this.initDB();
		
	}

	private async initDB() {
		let res = await this.pgclient.connect();
		res = await this.pgclient.query("CREATE TABLE IF NOT EXISTS trex.plugins (name VARCHAR(256) PRIMARY KEY, url VARCHAR(1024), version VARCHAR(256), payload JSONB, initialized BOOLEAN)");
	}

	private pgclient;
	private static _plugin : Plugins;

	public static async get() {
		if(!Plugins._plugin) {
			Plugins._plugin = new Plugins();
			await Plugins._plugin.initDB();
		}
		return Plugins._plugin;
	}

	async getPlugins() {
		const res = await this.pgclient.query("SELECT name, url, version FROM trex.plugins")
		return res;
	}

	static async initPluginsDev(app) {
		for await (const plugin of Deno.readDir(`${env.PLUGINS_DEV_PATH}`)) {
			if(plugin.isDirectory)
				logger.log(`Add Plugin ${plugin.name} from ${env.PLUGINS_DEV_PATH}`)
				try {
					const pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGINS_DEV_PATH}/${plugin.name}/package.json`));
					await (await Plugins.get()).addPlugin(app, `${env.PLUGINS_DEV_PATH}/${plugin.name}`, pkg, 'dev');
				} catch(e) {
					logger.error(`${plugin.name} does not have a package.json`)
				}
		}
	}

	static async initPluginsEnv(app) {
		const plugin = await Plugins.get();
		for(const name of env.PLUGINS_INIT) {
			try { 
				plugin.addPluginPackage(app, name)
			} catch(e) {
				logger.error(`${name} failed to install plugin`)
			}
		}
	}

	async addPluginPackage(app, name) {
		await Trex.installPlugin(`@${env.GH_ORG}/${name}`, `${env.PLUGINS_PATH}`)
		const pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGINS_PATH}/node_modules/@${env.GH_ORG}/${name}/package.json`));
		await this.addPlugin(app, `${env.PLUGINS_PATH}/node_modules/@${env.GH_ORG}/${name}/`, pkg, name);
		
	}
	

	async addPlugin(app, dir, pkg, url) {
		try {
			const q = `INSERT INTO trex.plugins (name, url, version, payload, initialized) VALUES  ('${pkg.name.replace(new RegExp(`@${env.GH_ORG}/`),'')}', '${url}', '${pkg.version}', '${JSON.stringify(pkg.trex)}', 'false') ON CONFLICT(name) DO UPDATE SET url = EXCLUDED.url, version = EXCLUDED.version, payload = EXCLUDED.payload, initialized = EXCLUDED.initialized`
			const r = await this.pgclient.query(q);
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
				}
			}
			const q2 = `UPDATE trex.plugins set initialized='true' where "name"='${pkg.name}'`
			const r2 = await this.pgclient.query(q2);
		} catch (e) { 
			logger.error(e);
		}
	}
}



