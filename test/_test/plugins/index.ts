


function  test_dbquery5() {
        console.log("USER WORKER Example");
        const dbm = Trex.databaseManager();
        console.log(dbm.getDatabases())
        console.log(dbm.getDatabaseCredentials())
        const conn = dbm.getConnection('demo_database', 'demo_cdm', "demo_cdm", {"duckdb": 
        (sql:string,
            schemaName:string,
            vocabSchemaName:string,
            parameters:any) => {
                //translate hana sql to duckdb sql
            return sql;
        }})

        const res = conn.execute("select count(1) from $$SCHEMA$$.person where person_id < ?",[{value:4000}], ((err:any,res:any) => {
            console.log(res);
            console.log(err);

        }));
        //res.then((r) => console.log(r)).catch((e) => console.error(e));
    
}

test_dbquery5()