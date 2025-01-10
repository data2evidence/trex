
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
	}

	private async initDB() {
		let res = await this.pgclient.connect();
		//res = await this.pgclient.query("CREATE TABLE IF NOT EXISTS trex.plugins (name VARCHAR(256) PRIMARY KEY, url VARCHAR(1024), version VARCHAR(256), payload JSONB)");
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

	private static async initPluginsDev(app) {
		for await (const plugin of Deno.readDir(`${env.PLUGINS_DEV_PATH}`)) {
			if(plugin.isDirectory)
				logger.log(`Add Plugin ${plugin.name} from ${env.PLUGINS_DEV_PATH}`)
				try {
					const pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGINS_DEV_PATH}/${plugin.name}/package.json`));
					pkg.version = pkg.version+"-dev"
					await (await Plugins.get()).addPlugin(app, `${env.PLUGINS_DEV_PATH}/${plugin.name}`, pkg, 'dev');
				} catch(e) {
					logger.error(`${plugin.name} does not have a package.json`)
				}
		}
	}

	private static async initPluginsEnv(app) {
		const plugin = await Plugins.get();
		for(const name of env.PLUGINS_INIT) {
			try { 
				await plugin.addPluginPackage(app, name, env.PLUGINS_SEED_UPDATE)
			} catch(e) {
				logger.error(`${name} failed to install plugin`)
				throw e
			}
		}
	}

	async isInstalled(name) {
		const q = `SELECT name, version, payload::JSON FROM trex.plugins where name = '${name}'`
		const r = await this.pgclient.query(q);
		if(r.rows.length > 0)
			return r.rows[0]
		return null
	}

	async delete(name) {
		const q = `DELETE from trex.plugins where name = '${name}'`
		const r = await this.pgclient.query(q);
		return r
	}

	async addPluginPackage(app, name, force = false) {
		let pkgname = "";
		let pkgurl = "";
		if(name.indexOf(":")<0) {
			pkgname = name
			if(name.indexOf("@")<0 && env.PLUGINS_API_VERSION)
				pkgname = `${name}@${env.PLUGINS_API_VERSION}`
			else 
				name = name.split("@")[0]

			pkgurl = `@${env.GH_ORG}/${pkgname}`
		} else {
			pkgurl = name
			name = pkgurl.split("/").pop()?.split(".")[0]
			pkgname = name
		}

		const _plugin = await this.isInstalled(name);
		let pkg = {};
		if(_plugin && !force) {
			logger.log(`skipping plugin install ${name} - already installed`)
			pkg = {name: _plugin.name, version: _plugin.version, trex: _plugin.payload}
		} else {
			
			await Trex.installPlugin(pkgurl, `${env.PLUGINS_PATH}`)
			pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGINS_PATH}/node_modules/@${env.GH_ORG}/${name}/package.json`));
		}
		await this.addPlugin(app, `${env.PLUGINS_PATH}/node_modules/@${env.GH_ORG}/${name}/`, pkg, name);
	}
	
	async addPlugin(app, dir, pkg, url) {
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
				}
			}
			const q = `INSERT INTO trex.plugins (name, url, version, payload) VALUES  ('${pkg.name.replace(new RegExp(`@${env.GH_ORG}/`),'')}', '${url}', '${pkg.version}', '${JSON.stringify(pkg.trex)}') ON CONFLICT(name) DO UPDATE SET url = EXCLUDED.url, version = EXCLUDED.version, payload = EXCLUDED.payload`
			const r = await this.pgclient.query(q);
		} catch (e) { 
			logger.error(e);
		}
	}

	static async initPlugins(app) {
		logger.log("Add plugins");
		await Plugins.initPluginsEnv(app);
		if(env.NODE_ENV === 'development') {
			try {
				await Plugins.initPluginsDev(app);
			} catch (e) {
				logger.error(e)
			}
		}
	}
}



