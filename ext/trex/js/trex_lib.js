import { core } from "ext:core/mod.js";

const ops = core.ops;

const {
	op_add_replication,
	op_install_plugin,
	op_execute_query,
} = ops;


class DatabaseManager {

}


class TrexDB {
	database;
	constructor(database) {
		this.database = database
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
				resolve(JSON.parse(op_execute_query(this.database, sql, nparams)));
			} catch(e) {
				reject(e);
			}
		});
	}
}

class PluginManager {
	path;
	constructor(path) {
		this.path = path;
	}

	install(pkg) {
		op_install_plugin(pkg, this.path);
	}
}

export { TrexDB, op_add_replication, PluginManager, DatabaseManager };
