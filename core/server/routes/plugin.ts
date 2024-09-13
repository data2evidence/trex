import {authn} from "../auth/authn.ts"
import {authz} from "../auth/authz.ts"
import {Plugins} from "../plugin/plugin.ts"
import {env} from "../env.ts"

export function addPluginRoutes(app) {
    app.get('/trex/plugins', authn, authz, async (c) => {
        const p = Plugins.get();
        let plugins = (await p.getPlugins())["rows"];
        if(c.req.query('all')) {
            const pkgs =  await fetch(`https://api.github.com/orgs/${env.GH_ORG}/packages?package_type=npm`, {headers: { "Authorization": `Bearer ${env.GH_TOKEN}`}})
            const tmp = await Promise.all((await pkgs.json()).map(async e => {
                const vres = await fetch(`https://api.github.com/orgs/${env.GH_ORG}/packages/npm/${e.name}/versions`, {headers: { "Authorization": `Bearer ${env.GH_TOKEN}`}})
                const versions = await vres.json();
                const version = versions.reduce((m, c) => { return c["name"] > m ? c["name"] : m }, "");
                const installed_plugin = plugins.filter(p => p.name === e.name)
                const r = {name: e.name, registry_version: version, version: installed_plugin[0]?.version, url: installed_plugin[0]?.url, installed: installed_plugin[0] ? true: false}
                return r
            }))
            const not_listed_plugins = plugins.filter(e =>  tmp.filter(p => p.name === e.name).length<1).map(p => {p["installed"]= true; return p})
            plugins = tmp.concat(not_listed_plugins)
        }
        return c.json(plugins);
    });

    app.post('/trex/plugins/:name', authn, authz, async (c) => {
        const p = Plugins.get();
        const name = c.param.name;
        p.addPluginPackage(app, name)
        return c.json(await p.getPlugins());
    });

    app.put('/trex/plugins/:name', authn, authz, async (c) => {
        const p = Plugins.get();
        const name = c.param.name;
        p.addPluginPackage(app, name)
        return c.json(await p.getPlugins());
    });

}
