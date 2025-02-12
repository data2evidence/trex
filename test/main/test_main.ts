
import { assertEquals } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";

function runtest(name:string, fn:any, delay:number) {
    setTimeout(async () => {
        console.log(`TEST ${name}`);
        await fn();
        console.log(`TEST ${name} done`)
    }, delay)
}

async function test_installPlugin() {
    const plugin = new Trex.PluginManager("./test/_tmpplugin");
    plugin.install("express");
}

async function init_test_replication() {
    Trex.addDB("test_publication","stdout_slot","test","localhost",65432,"postgres","postgres","mypass");
}


async function  test_dbquery() {
        const conn = new Trex.TrexDB("demo_database");
        try {
            const res = await conn.execute("select count (1) from demo_cdm.person where person_id < ?", [10]);
            console.log(res)
        } catch(e) {
            console.error(e)
        }
}



async function  test_dbquery2() {
 
        const conn = new Trex.TrexDB("demo_database");
        try {
        const res = await conn.execute("select count (1) from demo_cdm.person where birth_datetime < ?", ["2000-01-01"]);
        console.log(res)
    } catch(e) {
        console.error(e)
    }
    
}

async function  test_dbquery3() {

        const conn = new Trex.TrexDB("demo_database");
        try {
        const res = await conn.execute("select count (1) from demo_cdm.person where race_source_value = ?", ["white"]);
        console.log(res)
    } catch(e) {
        console.error(e)
    }
    
}

async function  test_dbquery4() {
   
        const conn = new Trex.TrexDB("demo_database");
        try {
        let res = await conn.execute("insert into demo_cdm.person (person_id, gender_concept_id, year_of_birth, month_of_birth, day_of_birth, birth_datetime, race_concept_id, ethnicity_concept_id, location_id, provider_id, care_site_id, person_source_value, gender_source_value, gender_source_concept_id, race_source_value, race_source_concept_id, ethnicity_source_value, ethnicity_source_concept_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [31337, 0, 0, 0, 0, "1990-01-01", 0, 0, 0, 0, 0, '', '', 0, '', 0, '', 0]);
       //let res = await conn.execute( "insert into demo_cdm.person (person_id, gender_concept_id, year_of_birth, month_of_birth, day_of_birth, birth_datetime, race_concept_id, ethnicity_concept_id, location_id, provider_id, care_site_id, person_source_value, gender_source_value, gender_source_concept_id, race_source_value, race_source_concept_id, ethnicity_source_value, ethnicity_source_concept_id) VALUES (31339, 0, 0, 0, 0, '1990-01-01', 0, 0, 0, 0, 0, '', '', 0, '', 0, '', 0)", []);
       
       console.log(res);
        res = await conn.execute("delete from demo_cdm.person where person_id > ?", [10000]);
        console.log(res)
    } catch(e) {
        console.error(e)
    }

    
}


async function  test_dbquery5() {
   
        const dbm = Trex.userDatabaseManager();
        const conn = dbm.getConnection('demo_database', 'demo_cdm', "demo_cdm", {"duckdb": (n:any) => n})

        const res = conn.execute("select count(1) from $$SCHEMA$$.person where person_id < ?",[{value:4000}], ((err:any,res:any) => {
            console.log(res);
            console.log(err);
            //assertEquals(res[0]["count(1)"], 2048);

        }));

    
}

const init_tests = {
    "install plugin": test_installPlugin,
    "init credentials": () => {
        const dbm = Trex.DatabaseManager.getDatabaseManager();
        const c = [
            {
                "id": "demo_database",
                "host": "localhost",
                "port": 65432,
                "code": "demo_database",
                "name": "postgres",
                "dialect": "postgres",
                "credentials": [
                    {
                        "username": "postgres",
                        "userScope": "Admin",
                        "serviceScope": "Internal",
                        "password": "mypass"
                    },
                    {
                        "username": "postgres",
                        "userScope": "Read",
                        "serviceScope": "Internal",
                        "password": "mypass"
                    }
                ],
                "publications": [
                    {"publication": "test_publication", "slot": "stdout_slot"}
                ],
                "extra": [
                    {
                        "value": {
                            "max": 50,
                            "queryTimeout": 60000,
                            "statementTimeout": 60000,
                            "idleTimeoutMillis": 300000,
                            "idleInTransactionSessionTimeout": 300000
                        },
                        "serviceScope": "Internal"
                    }
                ],
                "vocabSchemas": [
                    "demo_cdm"
                ]
            }
        ];
        dbm.setCredentials(c);
    }
}

const tests = {
    "dbquery #1": test_dbquery,
    "dbquery #2": test_dbquery2,
    "dbquery #3": test_dbquery3,
    "dbquery #4": test_dbquery4,
    "dbquery #5 (analytics interface)": test_dbquery5,
    "dbquery #6 (pg conn)": async () => {
        const dbm = Trex.userDatabaseManager();
        const conn = dbm.getConnection('demo_database', 'demo_cdm', "demo_cdm", {"duckdb": (n:any) => n})
        const res = conn.execute_write("select count(1) from $$SCHEMA$$.person where person_id < ?",[{value:4000}], ((err:any,res:any) => {

   // const res = conn.executeUpdate("insert into demo_cdm.person (person_id, gender_concept_id, year_of_birth, month_of_birth, day_of_birth, birth_datetime, race_concept_id, ethnicity_concept_id, location_id, provider_id, care_site_id, person_source_value, gender_source_value, gender_source_concept_id, race_source_value, race_source_concept_id, ethnicity_source_value, ethnicity_source_concept_id) VALUES (31337, 0, 0, 0, 0, '1990-01-01', 0, 0, 0, 0, 0, '', '', 0, '', 0, '', 0)", [], ((err:any,res:any) => {
        console.log(res);
        console.log(err);
        assertEquals(res[0]["count(1)"], 2048);

    }));
    

    },
    "dbquery #7 (pg conn insert)": async () => {
        try {
            const connx = new Trex.TrexDB("demo_database_pg");

            let resx = await connx.execute("delete from demo_cdm.person where person_id > ?", [10000]);
            console.log(resx);
            const dbm = Trex.userDatabaseManager();
            const conn = dbm.getConnection('demo_database', 'demo_cdm', "demo_cdm", {"duckdb": (n:any) => n})
            //const res = conn.execute_write("select count(1) from $$SCHEMA$$.person where person_id < ?",[{value:4000}], ((err:any,res:any) => {

            const res = conn.executeUpdate(
                "insert into demo_cdm.person (person_id, gender_concept_id, year_of_birth, month_of_birth, day_of_birth, birth_datetime, race_concept_id, ethnicity_concept_id, location_id, provider_id, care_site_id, person_source_value, gender_source_value, gender_source_concept_id, race_source_value, race_source_concept_id, ethnicity_source_value, ethnicity_source_concept_id) VALUES (31339, 0, 0, 0, 0, '1990-01-01', 0, 0, 0, 0, 0, '', '', 0, '', 0, '', 0)", 
                //"select count(1) from $$SCHEMA$$.person where person_id > 10000",
                [],
                async (err:any,res:any) => {
                    
                    console.log(res);
                    console.log(err);
                    resx = await connx.execute("delete from demo_cdm.person where person_id > ?", [10000]);
                    console.log(resx);
            // assertEquals(res[0]["count(1)"], 2048);

                }
            );
        } catch (e) {
            console.error(e);
        }
    }
}

export function test() {
    console.log("TEST main");

    for (const [key, value] of Object.entries(init_tests)) {
        runtest(key, value, 0);
    }
    for (const [key, value] of Object.entries(tests)) {
        runtest(key, value, 2000);
    }
}