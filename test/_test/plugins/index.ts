
import { assertEquals } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";


function  test_dbquery5() {
        console.log("USER WORKER Test #1");
        const dbm = Trex.databaseManager();
        console.log(dbm.getDatabases())
        const conn = dbm.getConnection('demo_database', 'demo_cdm', "demo_cdm", {"duckdb": (n:any) => n})

        const res = conn.execute("select count(1) from $$SCHEMA$$.person where person_id < ?",[{value:4000}], ((err:any,res:any) => {
            console.log(res);
            console.log(err);

        }));
        //res.then((r) => console.log(r)).catch((e) => console.error(e));
        console.log("USER WORKER Test #1 done");
    
}

test_dbquery5()