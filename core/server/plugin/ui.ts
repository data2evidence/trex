
import { serveStatic } from "npm:hono/deno";
import {env, global, logger} from "../env.ts"

function _addStatic(app, url, path) {
	logger.log(url + "   " + path);
	app.use(url+"/*", serveStatic({root: path, 
		rewriteRequestPath: (path) => {if(path == "/portal/login-callback") return ""; else return path.replace(new RegExp(`^${url}`), '')}, 
		onNotFound: (path, c) => {
			logger.log(`${path} is not found, you access ${c.req.path}`);
		}
	}));
}

export function addUIPlugin(app, value, dir) {
    if(value.routes)
        value.routes.forEach(r => {
            _addStatic(app, `${r.source}`, `${dir}${r.target}/`);
    });
    app.use('/portal/login', serveStatic({path: `${dir}/portal.index.html`}));
    if(value.uiplugins) {
        const tmp = JSON.stringify(value.uiplugins).replace(/\$\$FQDN\$\$/g, env.CADDY__ALP__PUBLIC_FQDN);
        for(const [k,v] of Object.entries(tmp)) {
            if(global.PLUGINS_JSON[k]) {
                global.PLUGINS_JSON[k].concat(v).filter((v, i, self) => self.map(x => x["route"]).lastIndexOf(v["route"]) == i);
            } else {
                global.PLUGINS_JSON[k] = v;
            }
        }
    }
}