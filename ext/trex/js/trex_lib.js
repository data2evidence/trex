import { core } from "ext:core/mod.js";

const ops = core.ops;

const {
	op_add_replication,
	op_install_plugin,
	op_execute_query,
} = ops;



class DatabaseManager {
	static #dbm;
	#credentials = [];
	#publications = {};

	#contructor() {}

	static getDatabaseManager() {
		if(!DatabaseManager.#dbm) {
			DatabaseManager.#dbm = new DatabaseManager();
		}
		return DatabaseManager.#dbm;
	}

	setCredentials(credentials) {
		this.#credentials = credentials;
		this.#updatePublications();
	}

	#updatePublications() {
		for(const c of this.#credentials) {
			if(c.publications) {
				const adminCredentials = c.credentials.filter(c => c.userScope === 'Admin')[0];
				for(const p of c.publications) {
					const key = `${c.id}_${p.publication}_${p.slot}`
					if(!(key in this.#publications)) {
						op_add_replication(p.publication, p.slot, key, c.host, c.port, c.name, adminCredentials.username, adminCredentials.password);
						this.#publications[key] = true;
					}
				}
			} 
		}
	}

	getPublications() {
		return this.#publications;
	}

	getCredentials() {
		return this.#credentials;
	}
}



class TrexDB {
	#database;
	constructor(database) {
		this.#database = database
	}

	execute(sql, params) {

		return new Promise((resolve, reject) => {
			try {
				const nparams= params.map(v => {
					if(typeof(v) === 'string' || v instanceof String) {
						try {
							const d = Date.parse(v);	
							if(/^\d\d\d\d-\d\d-\d\d/.test(v) && d) {
								return {"DateTime": d};
							}
						} catch (e) {}
						return {"String": v}

					}
					return {"Number": v};
				});
				console.log(nparams);
				resolve(JSON.parse(op_execute_query(this.#database, sql, nparams)));
			} catch(e) {
				reject(e);
			}
		});
	}
}

class PluginManager {
	#path;
	constructor(path) {
		this.#path = path;
	}

	install(pkg) {
		op_install_plugin(pkg, this.#path);
	}
}

export { TrexDB, op_add_replication, PluginManager, DatabaseManager };
