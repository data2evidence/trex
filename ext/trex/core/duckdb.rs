use std::sync::{Arc, Mutex, MutexGuard};

use async_trait::async_trait;
use chrono::prelude::DateTime;

use chrono::TimeDelta;
use duckdb::arrow::datatypes::DataType;
use duckdb::Rows;
use duckdb::{params, types::ValueRef, Connection, Statement, ToSql};
use futures::stream;
use futures::Stream;
use pgwire::api::auth::LoginInfo;
use pgwire::api::portal::{Format, Portal};
use pgwire::api::query::{ExtendedQueryHandler, SimpleQueryHandler};
use pgwire::api::results::{
    DataRowEncoder, DescribePortalResponse, DescribeStatementResponse, FieldInfo, QueryResponse,
    Response, Tag,
};
use pgwire::api::stmt::{NoopQueryParser, StoredStatement};
use pgwire::api::{ClientInfo, Type};
use pgwire::error::{ErrorInfo, PgWireError, PgWireResult};
use pgwire::messages::data::DataRow;

pub struct TrexDuckDB {
    conn: Arc<Mutex<Connection>>,
    query_parser: Arc<NoopQueryParser>,
}

#[async_trait]
impl SimpleQueryHandler for TrexDuckDB {
    async fn do_query<'a, C>(
        &self,
        _client: &mut C,
        query: &'a str,
    ) -> PgWireResult<Vec<Response<'a>>>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let login_info = LoginInfo::from_client_info(_client);
        let db = login_info.database().unwrap();

        let mut _query = &query.replace("::regclass", "::string")
        .replace("AND datallowconn AND NOT datistemplate", "AND NOT db.datname =('system') AND NOT db.datname =('temp')")
        .replace("pg_get_expr(ad.adbin, ad.adrelid, true)","pg_get_expr(ad.adbin, ad.adrelid)")
        .replace("pg_catalog.pg_relation_size(i.indexrelid)","''")
        .replace("pg_catalog.pg_stat_get_numscans(i.indexrelid)","''")
        .replace("pg_catalog.pg_inherits i,pg_catalog.pg_class c WHERE",
        "(select 0 as inhseqno, 0 as inhrelid, 0 as inhparent) as i join pg_catalog.pg_class as c ON")
        .replace("SELECT c.oid,c.*,t.relname as tabrelname,rt.relnamespace as refnamespace,d.description, null as consrc_copy",
        "SELECT c.oid,t.relname  as tabrelname,rt.relnamespace as refnamespace,d.description, null as consrc_copy");

        println!("TREX_DATABASE: {:?}", db);
        println!("QUERY: {_query}");

        let conn = self.conn.lock().unwrap();
        set_db(&conn, db);
        if _query.to_uppercase().starts_with("SELECT") {
            let mut stmt = conn
                .prepare(_query)
                .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
            //let header = Arc::new(row_desc_from_stmt(&stmt, &Format::UnifiedText)?);
            let _rows = stmt.query(params![]);

            _rows
                .map(|rows| {
                    let header = Arc::new(row_desc_from_row(&rows, &Format::UnifiedText).unwrap());
                    let s = encode_row_data(rows, header.clone());
                    vec![Response::Query(QueryResponse::new(header, s))]
                })
                .map_err(|e| PgWireError::ApiError(Box::new(e)))
        } else {
            conn.execute(_query, params![])
                .map(|affected_rows| {
                    vec![Response::Execution(
                        Tag::new("OK").with_rows(affected_rows),
                    )]
                })
                .map_err(|e| PgWireError::ApiError(Box::new(e)))
        }
    }
}

fn into_pg_type(df_type: &DataType) -> PgWireResult<Type> {
    Ok(match df_type {
        DataType::Null => Type::UNKNOWN,
        DataType::Boolean => Type::BOOL,
        DataType::Int8 | DataType::UInt8 => Type::CHAR,
        DataType::Int16 | DataType::UInt16 => Type::INT2,
        DataType::Int32 | DataType::UInt32 => Type::INT4,
        DataType::Int64 | DataType::UInt64 => Type::INT8,
        DataType::Timestamp(_, _) => Type::TIMESTAMP,
        DataType::Time32(_) | DataType::Time64(_) => Type::TIME,
        DataType::Date32 | DataType::Date64 => Type::DATE,
        DataType::Binary => Type::BYTEA,
        DataType::Float32 => Type::FLOAT4,
        DataType::Float64 => Type::FLOAT8,
        DataType::Decimal128(_, _) => Type::INT8,
        DataType::Utf8 => Type::VARCHAR,
        DataType::List(field) => match field.data_type() {
            DataType::Boolean => Type::BOOL_ARRAY,
            DataType::Int8 | DataType::UInt8 => Type::CHAR_ARRAY,
            DataType::Int16 | DataType::UInt16 => Type::INT2_ARRAY,
            DataType::Int32 | DataType::UInt32 => Type::INT4_ARRAY,
            DataType::Int64 | DataType::UInt64 => Type::INT8_ARRAY,
            DataType::Timestamp(_, _) => Type::TIMESTAMP_ARRAY,
            DataType::Time32(_) | DataType::Time64(_) => Type::TIME_ARRAY,
            DataType::Date32 | DataType::Date64 => Type::DATE_ARRAY,
            DataType::Binary => Type::BYTEA_ARRAY,
            DataType::Float32 => Type::FLOAT4_ARRAY,
            DataType::Float64 => Type::FLOAT8_ARRAY,
            DataType::Utf8 => Type::VARCHAR_ARRAY,
            list_type => {
                return Err(PgWireError::UserError(Box::new(ErrorInfo::new(
                    "ERROR".to_owned(),
                    "XX000".to_owned(),
                    format!("Unsupported List Datatype {list_type}"),
                ))));
            }
        },
        _ => {
            return Err(PgWireError::UserError(Box::new(ErrorInfo::new(
                "ERROR".to_owned(),
                "XX000".to_owned(),
                format!("Unsupported Datatype {df_type}"),
            ))));
        }
    })
}

fn set_db(conn: &MutexGuard<'_, Connection>, db: &str) {
    let query = format!("ATTACH IF NOT EXISTS '{db}.db'");
    let _r = conn
        .execute(&query, params![])
        .map_err(|error| println!("ERROR: {error}"));
    let query2 = format!("USE {db}");
    let _r2 = conn
        .execute(&query2, params![])
        .map_err(|error| println!("ERROR: {error}"));
}

fn row_desc_from_row(rows: &Rows, format: &Format) -> PgWireResult<Vec<FieldInfo>> {
    let stmt = rows.as_ref().unwrap();
    let columns = stmt.column_count();

    (0..columns)
        .map(|idx| {
            let datatype = stmt.column_type(idx);
            let name = stmt.column_name(idx).unwrap();

            Ok(FieldInfo::new(
                name.clone(),
                None,
                None,
                into_pg_type(&datatype).unwrap(),
                format.format_for(idx),
            ))
        })
        .collect()
}

fn row_desc_from_stmt(stmt: &Statement, format: &Format) -> PgWireResult<Vec<FieldInfo>> {
    let columns = stmt.column_count();

    (0..columns)
        .map(|idx| {
            let datatype = stmt.column_type(idx);
            let name = stmt.column_name(idx).unwrap();

            Ok(FieldInfo::new(
                name.clone(),
                None,
                None,
                into_pg_type(&datatype).unwrap(),
                format.format_for(idx),
            ))
        })
        .collect()
}

#[async_trait]
impl ExtendedQueryHandler for TrexDuckDB {
    type Statement = String;
    type QueryParser = NoopQueryParser;

    fn query_parser(&self) -> Arc<Self::QueryParser> {
        self.query_parser.clone()
    }

    async fn do_query<'a, C>(
        &self,
        _client: &mut C,
        portal: &'a Portal<Self::Statement>,
        _max_rows: usize,
    ) -> PgWireResult<Response<'a>>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let conn = self.conn.lock().unwrap();
        let query = &portal.statement.statement;
        let mut stmt = conn
            .prepare_cached(query)
            .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
        let params = get_params(portal);
        let params_ref = params
            .iter()
            .map(|f| f.as_ref())
            .collect::<Vec<&dyn duckdb::ToSql>>();

        if query.to_uppercase().starts_with("SELECT") {
            let header = Arc::new(row_desc_from_stmt(&stmt, &portal.result_column_format)?);
            stmt.query::<&[&dyn duckdb::ToSql]>(params_ref.as_ref())
                .map(|rows| {
                    let s = encode_row_data(rows, header.clone());
                    Response::Query(QueryResponse::new(header, s))
                })
                .map_err(|e| PgWireError::ApiError(Box::new(e)))
        } else {
            stmt.execute::<&[&dyn duckdb::ToSql]>(params_ref.as_ref())
                .map(|affected_rows| {
                    Response::Execution(Tag::new("OK").with_rows(affected_rows).into())
                })
                .map_err(|e| PgWireError::ApiError(Box::new(e)))
        }
    }

    async fn do_describe_statement<C>(
        &self,
        _client: &mut C,
        stmt: &StoredStatement<Self::Statement>,
    ) -> PgWireResult<DescribeStatementResponse>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let conn = self.conn.lock().unwrap();
        let param_types = stmt.parameter_types.clone();
        let stmt = conn
            .prepare_cached(&stmt.statement)
            .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
        row_desc_from_stmt(&stmt, &Format::UnifiedBinary)
            .map(|fields| DescribeStatementResponse::new(param_types, fields))
    }

    async fn do_describe_portal<C>(
        &self,
        _client: &mut C,
        portal: &Portal<Self::Statement>,
    ) -> PgWireResult<DescribePortalResponse>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let conn = self.conn.lock().unwrap();
        let stmt = conn
            .prepare_cached(&portal.statement.statement)
            .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
        row_desc_from_stmt(&stmt, &portal.result_column_format)
            .map(DescribePortalResponse::new)
    }
}

fn encode_row_data(
    mut rows: Rows<'_>,
    schema: Arc<Vec<FieldInfo>>,
) -> impl Stream<Item = PgWireResult<DataRow>> {
    let mut results = Vec::new();
    let ncols = schema.len();
    while let Ok(Some(row)) = rows.next() {
        let mut encoder = DataRowEncoder::new(schema.clone());
        for idx in 0..ncols {
            let data = row.get_ref_unwrap::<usize>(idx);
            match data {
                ValueRef::Null => encoder.encode_field(&None::<i8>).unwrap(),
                ValueRef::Boolean(b) => {
                    encoder.encode_field(&b).unwrap();
                }
                ValueRef::TinyInt(i) => {
                    encoder.encode_field(&i).unwrap();
                }
                ValueRef::SmallInt(i) => {
                    encoder.encode_field(&i).unwrap();
                }
                ValueRef::Int(i) => {
                    encoder.encode_field(&i).unwrap();
                }
                ValueRef::BigInt(i) => {
                    encoder.encode_field(&i).unwrap();
                }
                ValueRef::Float(f) => {
                    encoder.encode_field(&f).unwrap();
                }
                ValueRef::Double(f) => {
                    encoder.encode_field(&f).unwrap();
                }
                ValueRef::Text(t) => {
                    encoder
                        .encode_field(&String::from_utf8_lossy(t).as_ref())
                        .unwrap();
                }
                ValueRef::Date32(d) => {
                    //TODO: TREX FIX CONVERSION
                    let mut t2: i64 = i64::from(d);
                    let mut t3 = 0;
                    if t2 < 0 {
                        t2 = 0;
                        t3 = t2;
                    }
                    //println!("TIME: {time} {t2}");
                    encoder
                        .encode_field(&DateTime::from_timestamp(t2, 0)
                            .expect("TREX: Date conversion failed")
                            .checked_sub_signed(TimeDelta::nanoseconds(t3))
                            .expect("TREX: Date conversion failed")
                            .format("%Y-%m-%d")
                            .to_string(),
                        )
                        .unwrap();
                }
                ValueRef::Timestamp(_unit, time) => {
                    //TODO: TREX FIX CONVERSION
                    let mut t2 = time / 1000 / 1000;
                    let mut t3 = 0;
                    if t2 < 0 {
                        t2 = 0;
                        t3 = t2;
                    }
                    //println!("TIME: {time} {t2}");
                    encoder
                        .encode_field(&DateTime::from_timestamp(t2, 0)
                            .expect("TREX: Date conversion failed")
                            .checked_sub_signed(TimeDelta::nanoseconds(t3))
                            .expect("TREX: Date conversion failed")
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string(),
                        )
                        .unwrap();
                }
                ValueRef::Blob(b) => {
                    encoder.encode_field(&b).unwrap();
                }
                _ => {
                    unimplemented!("More types to be supported. {:?}", data)
                }
            }
        }

        results.push(encoder.finish());
    }

    stream::iter(results)
}

fn get_params(portal: &Portal<String>) -> Vec<Box<dyn ToSql>> {
    let mut results = Vec::with_capacity(portal.parameter_len());
    for i in 0..portal.parameter_len() {
        let param_type = portal.statement.parameter_types.get(i).unwrap();
        // we only support a small amount of types for demo
        match param_type {
            &Type::BOOL => {
                let param = portal.parameter::<bool>(i, param_type).unwrap();
                results.push(Box::new(param) as Box<dyn ToSql>);
            }
            &Type::INT2 => {
                let param = portal.parameter::<i16>(i, param_type).unwrap();
                results.push(Box::new(param) as Box<dyn ToSql>);
            }
            &Type::INT4 => {
                let param = portal.parameter::<i32>(i, param_type).unwrap();
                results.push(Box::new(param) as Box<dyn ToSql>);
            }
            &Type::INT8 => {
                let param = portal.parameter::<i64>(i, param_type).unwrap();
                results.push(Box::new(param) as Box<dyn ToSql>);
            }
            &Type::TEXT | &Type::VARCHAR => {
                let param = portal.parameter::<String>(i, param_type).unwrap();
                results.push(Box::new(param) as Box<dyn ToSql>);
            }
            &Type::FLOAT4 => {
                let param = portal.parameter::<f32>(i, param_type).unwrap();
                results.push(Box::new(param) as Box<dyn ToSql>);
            }
            &Type::FLOAT8 => {
                let param = portal.parameter::<f64>(i, param_type).unwrap();
                results.push(Box::new(param) as Box<dyn ToSql>);
            }
            _ => {
                unimplemented!("parameter type not supported")
            }
        }
    }

    results
}

impl TrexDuckDB {
    pub fn new() -> TrexDuckDB {
        TrexDuckDB {
            conn: Arc::new(Mutex::new(Connection::open_in_memory().unwrap())),
            query_parser: Arc::new(NoopQueryParser::new()),
        }
    }
}

impl Default for TrexDuckDB {
    fn default() -> Self {
        Self::new()
    }
}
