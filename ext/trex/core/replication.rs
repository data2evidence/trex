use crate::core::sink::DuckDbSink;

use std::{error::Error, time::Duration};

use pg_replicate::{
    pipeline::{
        batching::{data_pipeline::BatchDataPipeline, BatchConfig},
        sources::postgres::{PostgresSource, TableNamesFrom},
        PipelineAction,
    },
    //table::TableName,
};
//use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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

pub async fn trex_replicate(
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
            let postgres_source = PostgresSource::new(
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

    let duckdb_sink = DuckDbSink::file(duckdb_file).await?;

    let batch_config = BatchConfig::new(1000, Duration::from_secs(10));
    let mut pipeline = BatchDataPipeline::new(postgres_source, duckdb_sink, action, batch_config);

    pipeline.start().await?;

    Ok(())
}
