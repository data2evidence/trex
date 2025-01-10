
mod core;
pub use core::auth::{AuthType, TrexAuthSource, get_startup_handler};
use core::duckdb::TrexDuckDB;
use core::replication::{trex_replicate, ReplicateCommand};


use std::sync::Arc;
use std::process::Command;

use pgwire::api::auth::md5pass::Md5PasswordAuthStartupHandler;
use pgwire::api::auth::DefaultServerParameterProvider;
use pgwire::api::copy::NoopCopyHandler;
use pgwire::api::{NoopErrorHandler, PgWireServerHandlers};
use pgwire::tokio::process_socket;
use tokio::net::TcpListener;

pub struct TrexDuckDBFactory {
    handler: Arc<TrexDuckDB>,
    auth_type: AuthType,
}

impl PgWireServerHandlers for TrexDuckDBFactory {
    type StartupHandler = Md5PasswordAuthStartupHandler<TrexAuthSource,DefaultServerParameterProvider>;
    type SimpleQueryHandler = TrexDuckDB;
    type ExtendedQueryHandler = TrexDuckDB;
    type CopyHandler = NoopCopyHandler;
    type ErrorHandler = NoopErrorHandler;

    fn simple_query_handler(&self) -> Arc<Self::SimpleQueryHandler> {
        self.handler.clone()
    }

    fn extended_query_handler(&self) -> Arc<Self::ExtendedQueryHandler> {
        self.handler.clone()
    }

    fn startup_handler(&self) -> Arc<Self::StartupHandler> {
        get_startup_handler(&self.auth_type)
    }

    fn copy_handler(&self) -> Arc<Self::CopyHandler> {
        Arc::new(NoopCopyHandler)
    }

    fn error_handler(&self) -> Arc<Self::ErrorHandler> {
        Arc::new(NoopErrorHandler)
    }
}


pub fn add_replication(publication: String, slot_name: String, duckdb_file: String, db_host: String, db_port: u16, db_name: String, db_username: String, db_password: String) {
    let command: ReplicateCommand = ReplicateCommand::Cdc { publication: publication, slot_name: slot_name};
    tokio::spawn(async move { trex_replicate(command,duckdb_file.as_str(),db_host.as_str(), db_port, db_name.as_str(), db_username.as_str(), Some(db_password)).await.map_err(|error| println!("ERROR: {error}")) });
}

pub fn install_plugin(name: String, dir: String) {
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

pub async fn start_sql_server(port: u16, auth_type: AuthType) {
    let factory = Arc::new(TrexDuckDBFactory {
        handler: Arc::new(TrexDuckDB::new()),
        auth_type:  auth_type,
    });
    let _server_addr = format!("127.0.0.1:{port}");
    let server_addr =  _server_addr.as_str();
    let listener = TcpListener::bind(server_addr).await.unwrap();
    println!(
        "TREX SQL Server Listening to {}",
        server_addr
    );
    loop {
        let incoming_socket = listener.accept().await.unwrap();
        let factory_ref = factory.clone();

        tokio::spawn(async move { process_socket(incoming_socket.0, factory_ref).await });
    }
}


#[tokio::main]
pub async fn main() {
    let _r = add_replication("my_publication".to_owned(),"stdout_slot".to_owned(),"test.db".to_owned(),"localhost".to_owned(),15432,"postgres".to_owned(),"postgres".to_owned(),"mypass".to_owned());
    let _s = tokio::spawn(async move { start_sql_server(5432, AuthType::Default { password: String::from("pencil") }).await }).await;
}
