function test_installPlugin() {
    console.log("TEST installPlugin");
    Trex.installPlugin("express", "./test/_tmpplugin");
    console.log("TEST installPlugin done");
}

function test_replication() {
    console.log("TEST rep");
    Trex.addDB("test_publication","stdout_slot","test","localhost",65432,"postgres","postgres","mypass");
    console.log("TEST rep done");
}


export function test() {
    console.log("TEST main");
    test_installPlugin()
    test_replication();
}