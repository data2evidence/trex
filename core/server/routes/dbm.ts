import {authn} from "../auth/authn.ts"
import {authz} from "../auth/authz.ts"

export function addDBManagementRoutes(app) {
    
    app.post('/trex/db/:name', authn, authz, async (c) => {
        const name = c.req.param('name')+".db";
        const body = await c.req.json();

        Trex.addDB(body.publication, body.slot_name, name, body.db_host, Number(body.db_port), body.db_name, body.db_username, body.db_password);
        return c.json({"message": "ok"});
    });

    app.delete('/trex/db/:name', authn, authz, async (c) => {
        return c.json({"message": "ok"});
    })
}