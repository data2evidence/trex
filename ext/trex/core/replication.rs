use std::{error::Error, time::Duration};
use std::sync::{Arc, Mutex};
use duckdb::Connection;

use crate::pipeline::{
        batching::{data_pipeline::BatchDataPipeline, BatchConfig},
        sinks::duckdb::DuckDbSink,
        sources::postgres::{PostgresSource, TableNamesFrom},
        PipelineAction,
    };
    //table::TableName,

//use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub enum ReplicateCommand {
    // CopyTable { schema: String, name: String },
    Cdc {
        publication: String,
        slot_name: String,
    },
}

/*
fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "duckdb=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

fn set_log_level() {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info");
    }
}
*/

async fn create_pipeline(duckdb: &Arc<Mutex<Connection>>,
    command: ReplicateCommand,
    duckdb_file: &str,
    db_host: &str,
    db_port: u16,
    db_name: &str,
    db_username: &str,
    db_password: Option<String>,
) -> Result<BatchDataPipeline<PostgresSource, DuckDbSink>, Box<dyn Error>>{
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

    let duckdb_sink: DuckDbSink = DuckDbSink::trexdb(duckdb, duckdb_file).await?;//DuckDbSink::file(duckdb_file).await?;//

    let batch_config = BatchConfig::new(100000, Duration::from_secs(10));
    Ok(BatchDataPipeline::new(postgres_source, duckdb_sink, action, batch_config))
}

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
    //set_log_level();
    //init_tracing();
    let mut retries = 0;
    while retries < 2 {
        let mut pipeline = create_pipeline(duckdb, command.clone(), duckdb_file, db_host, db_port, db_name, db_username, db_password.clone()).await?;
        pipeline.start().await;
        retries = retries + 1;
        println!("restarting pipeline ... try {retries}");
    }
    Ok(())
}
