pub mod clients;
pub mod conversions;
pub mod pipeline;
pub mod sql;
use std::process;

use deno_core::error::AnyError;
use deno_core::op2;
use duckdb::arrow::record_batch::RecordBatch;
use duckdb::{params_from_iter, types::ToSqlOutput, types::Value, Connection, Result, ToSql};
use pgwire::tokio::process_socket;
use serde::{Deserialize, Serialize};
pub use sql::{
    auth::AuthType,
    duckdb::{TrexDuckDB, TrexDuckDBFactory},
};
use std::process::Command;
use std::sync::{Arc, LazyLock, Mutex};
use std::time::SystemTime;
use std::{error::Error, time::Duration};
use tokio::net::TcpListener;
use tracing::warn;

use crate::pipeline::{
    batching::{data_pipeline::BatchDataPipeline, BatchConfig},
    sinks::duckdb::DuckDbSink,
    sources::postgres::{PostgresSource, TableNamesFrom},
    PipelineAction,
};

static TREX_DB: LazyLock<Arc<Mutex<Connection>>> =
    LazyLock::new(|| Arc::new(Mutex::new(Connection::open_in_memory().unwrap())));

static DB_CREDENTIALS: LazyLock<Arc<Mutex<String>>> = LazyLock::new(|| {
    Arc::new(Mutex::new(String::from(
        "{\"credentials\":[], \"publications\":{}}",
    )))
});

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

#[derive(Clone)]
pub enum ReplicateCommand {
    // CopyTable { schema: String, name: String },
    Cdc {
        publication: String,
        slot_name: String,
    },
}

#[allow(clippy::too_many_arguments)]
async fn create_pipeline(
    duckdb: &Arc<Mutex<Connection>>,
    command: ReplicateCommand,
    duckdb_file: &str,
    db_host: &str,
    db_port: u16,
    db_name: &str,
    db_username: &str,
    db_password: Option<String>,
) -> Result<BatchDataPipeline<PostgresSource, DuckDbSink>, Box<dyn Error>> {
    let (postgres_source, action) = match command {
        /* ReplicateCommand::CopyTable { schema, name } => {
            let table_names = vec![TableName { schema, name }];

            let postgres_source = PostgresSource::new(
                db_host,
                db_port,
                db_name,
                db_username,
                db_password,
                None,
                TableNamesFrom::Vec(table_names),
            )
            .await?;
            (postgres_source, PipelineAction::TableCopiesOnly)
        } */
        ReplicateCommand::Cdc {
            publication,
            slot_name,
        } => {
            let postgres_source: PostgresSource = PostgresSource::new(
                db_host,
                db_port,
                db_name,
                db_username,
                db_password,
                Some(slot_name),
                TableNamesFrom::Publication(publication),
            )
            .await?;

            (postgres_source, PipelineAction::Both)
        }
    };

    let duckdb_sink: DuckDbSink = DuckDbSink::trexdb(duckdb, duckdb_file).await?; //DuckDbSink::file(duckdb_file).await?;//

    let batch_config = BatchConfig::new(100000, Duration::from_secs(10));
    Ok(BatchDataPipeline::new(
        postgres_source,
        duckdb_sink,
        action,
        batch_config,
    ))
}

#[allow(clippy::too_many_arguments)]
pub async fn trex_replicate(
    duckdb: &Arc<Mutex<Connection>>,
    command: ReplicateCommand,
    duckdb_file: &str,
    db_host: &str,
    db_port: u16,
    db_name: &str,
    db_username: &str,
    db_password: Option<String>,
) -> Result<(), Box<dyn Error>> {
    let mut retries = 0;
    let mut start = SystemTime::now();
    while retries < 5 {
        let mut pipeline = create_pipeline(
            duckdb,
            command.clone(),
            duckdb_file,
            db_host,
            db_port,
            db_name,
            db_username,
            db_password.clone(),
        )
        .await?;
        pipeline.start().await?;
        let duration = SystemTime::now().duration_since(start)?;
        if duration.as_secs() < 300 {
            retries += 1;
        } else {
            retries = 0;
            start = SystemTime::now();
        }
        println!("restarting pipeline ... (try {retries})");
    }
    Ok(())
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

#[op2]
#[string]
fn op_get_dbc() -> String {
    return (*(*DB_CREDENTIALS)).lock().unwrap().clone();
}

#[op2(fast)]
fn op_set_dbc(#[string] dbc: String) {
    *(*(*DB_CREDENTIALS)).lock().unwrap() = dbc;
}

#[op2(fast)]
fn op_install_plugin(#[string] name: String, #[string] dir: String) {
    Command::new("npx")
        .args(["bun", "install", "-f", "--no-cache", "--no-save", &name])
        .current_dir(dir)
        .status()
        .expect("failed to execute process");
}

#[op2(fast)]
fn op_exit(code: i32) {
    process::exit(code);
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

    /*let n = stmt.parameter_count();
    let mut tparams: Vec<TrexType> = Vec::new();
    for i in 0..n {
        let t: ffi::duckdb_type = stmt.parameter_type(i.try_into().unwrap());
        print!("TYPE: {t}");
        match t {
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_BIGINT |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_HUGEINT |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_INTEGER |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_SMALLINT |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_TINYINT => {
                tparams.push(TrexType::Integer(params.get(i).unwrap().parse::<i64>().unwrap()));
            }
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_UBIGINT |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_UHUGEINT |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_UINTEGER |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_USMALLINT |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_UTINYINT |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_VARINT => {
                tparams.push(TrexType::Integer(params.get(i).unwrap().parse::<i64>().unwrap()));
            }
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_DECIMAL |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_DOUBLE |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_FLOAT => {
                tparams.push(TrexType::Number(params.get(i).unwrap().parse::<f64>().unwrap()));
            }
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_MS |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_NS |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_S |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_TZ  => {
                tparams.push(TrexType::DateTime(params.get(i).unwrap().parse::<i64>().unwrap()));
            }
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_ANY |
            ffi::DUCKDB_TYPE_DUCKDB_TYPE_VARCHAR |
            _ => {
                tparams.push(TrexType::String((params.get(i).unwrap()).clone()));
            }
        }

    }*/

    let rows: Vec<RecordBatch> = stmt.query_arrow(params_from_iter(params.iter()))?.collect();
    let buffer = Vec::new();
    let mut writer = arrow_json::ArrayWriter::new(buffer);
    for row in rows {
        writer.write(&row).unwrap();
    }
    writer.finish().unwrap();
    let buffer = writer.into_inner();
    let s = String::from_utf8(buffer).unwrap();
    //warn!(s);
    Ok(s)
}

deno_core::extension!(
    sb_trex,
    ops = [
        op_add_replication,
        op_install_plugin,
        op_execute_query,
        op_exit,
        op_get_dbc,
        op_set_dbc
    ],
    esm_entry_point = "ext:sb_trex/js/trex_lib.js",
    esm = [
        "js/trex_lib.js",
        "js/pgconnection.js",
        "js/hdbconnection.js"
    ]
);
