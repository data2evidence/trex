import { core } from "ext:core/mod.js";

const ops = core.ops;

const {
	op_add_replication,
	op_install_plugin,
} = ops;


class Cache {

	_database;
	constructor(database) {
		_database = database
	}
	execute = function(sql, params) {

	}
}

export { Cache, op_add_replication, op_install_plugin };
