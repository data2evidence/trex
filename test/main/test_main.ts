function test_installPlugin() {
    console.log("TEST installPlugin");
    const plugin = new Trex.PluginManager("./test/_tmpplugin");
    plugin.install("express");
    console.log("TEST installPlugin done");
}

function test_replication() {
    console.log("TEST rep");
    Trex.addDB("test_publication","stdout_slot","test","localhost",65432,"postgres","postgres","mypass");
    console.log("TEST rep done");
}

function  test_dbquery() {
    setTimeout(() => {
        console.log("TEST trexdb");
        const conn = new Trex.TrexDB("test");
        const res = conn.execute("select count (1) from demo_cdm.person where person_id < ?", [10]);
        res.then((r) => console.log(r)).catch((e) => console.error(e));
        console.log("TEST trexdb done");
    }, 2000);
    
}

function  test_dbquery2() {
    setTimeout(() => {
        console.log("TEST trexdb");
        const conn = new Trex.TrexDB("test");
        const res = conn.execute("select count (1) from demo_cdm.person where birth_datetime < ?", ["2000-01-01"]);
        res.then((r) => console.log(r)).catch((e) => console.error(e));
        console.log("TEST trexdb done");
    }, 2000);
    
}

function  test_dbquery3() {
    setTimeout(() => {
        console.log("TEST trexdb3");
        const conn = new Trex.TrexDB("test");
        const res = conn.execute("select count (1) from demo_cdm.person where race_source_value = ?", ["white"]);
        res.then((r) => console.log(r)).catch((e) => console.error(e));
        console.log("TEST trexdb3 done");
    }, 2000);
    
}


export function test() {
    console.log("TEST main");
    test_replication();
    test_installPlugin()
    test_dbquery()
    test_dbquery2();
    test_dbquery3();

}