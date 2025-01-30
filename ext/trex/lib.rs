pub mod clients;
pub mod conversions;
pub mod pipeline;
pub mod replication;
pub mod sql;
pub mod table;
use deno_core::error::AnyError;
use deno_core::op2;
use duckdb::arrow::record_batch::RecordBatch;
use duckdb::{params_from_iter, types::ToSqlOutput, types::Value, Connection, Result, ToSql};
use pgwire::tokio::process_socket;
use replication::{trex_replicate, ReplicateCommand};
use serde::{Deserialize, Serialize};
pub use sql::{
    auth::AuthType,
    duckdb::{TrexDuckDB, TrexDuckDBFactory},
};
use std::process::Command;
use std::sync::{Arc, LazyLock, Mutex};
use tokio::net::TcpListener;
use tracing::warn;

static TREX_DB: LazyLock<Arc<Mutex<Connection>>> =
    LazyLock::new(|| Arc::new(Mutex::new(Connection::open_in_memory().unwrap())));

pub async fn start_sql_server(ip: &str, port: u16, auth_type: AuthType) {
    let factory = Arc::new(TrexDuckDBFactory {
        handler: Arc::new(TrexDuckDB::new(&TREX_DB)),
        auth_type,
    });
    let _server_addr = format!("{ip}:{port}");
    let server_addr = _server_addr.as_str();
    let listener = TcpListener::bind(server_addr).await.unwrap();
    warn!("TREX SQL Server Listening to {}", server_addr);
    loop {
        let incoming_socket = listener.accept().await.unwrap();
        let factory_ref = factory.clone();

        tokio::spawn(async move { process_socket(incoming_socket.0, factory_ref).await });
    }
}

#[allow(clippy::too_many_arguments)]
#[op2(fast)]
fn op_add_replication(
    #[string] publication: String,
    #[string] slot_name: String,
    #[string] duckdb_file: String,
    #[string] db_host: String,
    db_port: u16,
    #[string] db_name: String,
    #[string] db_username: String,
    #[string] db_password: String,
) {
    warn!("TREX START REPLICATION: {duckdb_file}");
    let command: ReplicateCommand = ReplicateCommand::Cdc {
        publication,
        slot_name,
    };
    tokio::spawn(async move {
        trex_replicate(
            &TREX_DB,
            command,
            duckdb_file.as_str(),
            db_host.as_str(),
            db_port,
            db_name.as_str(),
            db_username.as_str(),
            Some(db_password),
        )
        .await
        .map_err(|error| println!("ERROR: {error}"))
    });
}

#[op2(fast)]
fn op_install_plugin(#[string] name: String, #[string] dir: String) {
    Command::new("npx")
        .args([
            "bun",
            "install",
            "-f",
            "--silent",
            "--no-cache",
            "--no-save",
            &name,
        ])
        .current_dir(dir)
        .status()
        .expect("failed to execute process");
}

#[derive(Serialize, Deserialize)]
enum TrexType {
    Integer(i64),
    String(String),
    Number(f64),
    DateTime(i64),
}

impl ToSql for TrexType {
    fn to_sql(&self) -> duckdb::Result<ToSqlOutput<'_>> {
        match self {
            TrexType::Integer(v) => {
                let value: Value = (*v).into();
                Ok(ToSqlOutput::Owned(value))
            }
            TrexType::String(v) => {
                let value: Value = v.clone().into();
                Ok(ToSqlOutput::Owned(value))
            }
            TrexType::DateTime(v) => {
                let value: Value = Value::Timestamp(duckdb::types::TimeUnit::Millisecond, *v);
                Ok(ToSqlOutput::Owned(value))
            }
            TrexType::Number(v) => {
                let value: Value = (*v).into();
                Ok(ToSqlOutput::Owned(value))
            }
        }
    }
}

#[op2]
#[string]
fn op_execute_query(
    #[string] database: String,
    #[string] sql: String,
    #[serde] params: Vec<TrexType>,
) -> Result<String, AnyError> {
    let conn = &*TREX_DB.lock().unwrap();
    let _ = conn
        .execute(&format!("USE {database}"), [])
        .inspect_err(|e| warn!("{e}"));
    let mut stmt = conn.prepare(&sql)?;

    //let n = stmt.parameter_count();

    //let _x: ffi::duckdb_type;
    //ffi::duckdb_param_type(stmt.into_raw(), i);

    let rows: Vec<RecordBatch> = stmt.query_arrow(params_from_iter(params.iter()))?.collect();
    let buffer = Vec::new();
    let mut writer = arrow_json::ArrayWriter::new(buffer);
    for row in rows {
        writer.write(&row).unwrap();
    }
    writer.finish().unwrap();
    let buffer = writer.into_inner();
    let s = String::from_utf8(buffer).unwrap();
    warn!(s);
    Ok(s)
}

deno_core::extension!(
    sb_trex,
    ops = [op_add_replication, op_install_plugin, op_execute_query,],
    esm_entry_point = "ext:sb_trex/js/trex_lib.js",
    esm = ["js/trex_lib.js",]
);
