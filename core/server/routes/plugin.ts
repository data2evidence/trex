import {authn} from "../auth/authn.ts"
import {authz} from "../auth/authz.ts"
import {Plugins} from "../plugin/plugin.ts"
import {env, logger} from "../env.ts"
import { HTTPException } from 'npm:hono/http-exception'
import * as semver from 'npm:semver'

function _checkSemver(version, sver) {
    if(sver === 'compatible')
        sver = env.PLUGINS_API_VERSION
    if(sver && sver != "latest" && sver != 'all') {
        return semver.satisfies(version, sver)
    }
    return true
}

export function addPluginRoutes(app) {
    app.get('/trex/plugins', authn, authz, async (c) => {
        const p = await Plugins.get();
        const q = c.req.query('version') || 'compatible'

        let instplugins = (await p.getPlugins())["rows"];
        if(q === 'none')
            return  c.json(instplugins);

        const pkgs =  await fetch(`https://api.github.com/orgs/${env.GH_ORG}/packages?package_type=npm`, {headers: { "Authorization": `Bearer ${env.GH_TOKEN}`}})
        const tmp = await Promise.all((await pkgs.json()).map(async e => {
            const vres = await fetch(`https://api.github.com/orgs/${env.GH_ORG}/packages/npm/${e.name}/versions`, {headers: { "Authorization": `Bearer ${env.GH_TOKEN}`}})
            const versions = await vres.json();
            const version = versions.reduce((m, c) => { return c["name"] > m && _checkSemver(c["name"], q) ? c["name"] : m }, "");
            const installed_plugin = instplugins.filter(p => p.name === e.name)
            const r = {name: e.name, registry_version: version, version: installed_plugin[0]?.version, url: installed_plugin[0]?.url, installed: installed_plugin[0] ? true: false}
            return r
        }))
        const not_listed_plugins = instplugins.filter(e =>  tmp.filter(p => p.name === e.name).length<1).map(p => {p["installed"]= true; return p})
        return c.json(tmp.concat(not_listed_plugins))
    });

    app.patch('/trex/plugins', authn, authz, async (c) => {
        Plugins.initPlugins(app);
    })

    app.post('/trex/plugins/:name', authn, authz, async (c) => {
        const p = await Plugins.get();
        const name = c.req.param('name');
        if(await p.isInstalled(name))
            throw new HTTPException(500, { message: `${name} is already installed` })
        try {
            await p.addPluginPackage(app, name)
        } catch(e) {
            logger.error(`${name} failed to install plugin`)
            throw new HTTPException(500, { message: `${name} failed to install plugin` })
        }
        const gp = (await p.getPlugins())["rows"]
        return c.json(gp);
    });

    app.put('/trex/plugins/:name', authn, authz, async (c) => {
        const p = await Plugins.get();
        const name = c.req.param('name');
        try {
            await p.addPluginPackage(app, name, true)
        } catch(e) {
            logger.error(`${name} failed to install plugin`)
            throw new HTTPException(500, { message: `${name} failed to update plugin` })
        }
        const gp = (await p.getPlugins())["rows"]
        return c.json(gp);
    });

    app.delete('/trex/plugins/:name', authn, authz, async (c) => {
        const p = await Plugins.get();
        const name = c.req.param('name');
        p.delete(name);
        return c.json({"message": "ok"});
    })

}
