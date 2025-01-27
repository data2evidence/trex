use deno_core::op2;

use trex::{add_replication, install_plugin};


#[allow(clippy::too_many_arguments)]
#[op2(fast)]
fn op_add_replication(
    #[string] publication: String,
    #[string] slot_name: String,
    #[string] duckdb_file: String,
    #[string] db_host: String,
    #[smi] db_port: i32,
    #[string] db_name: String,
    #[string] db_username: String,
    #[string] db_password: String,
) {
    add_replication(
        publication,
        slot_name,
        duckdb_file,
        db_host,
        db_port.try_into().unwrap(),
        db_name,
        db_username,
        db_password,
    );
}

#[op2(fast)]
fn op_install_plugin(#[string] name: String, #[string] dir: String) {
    install_plugin(name, dir);
}



deno_core::extension!(
    sb_trex,
    ops = [
        op_add_replication,
        op_install_plugin,
    ],
    esm_entry_point = "ext:sb_trex/trex_lib.js",
    esm = ["trex_lib.js",]
);
