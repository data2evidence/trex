
import { serveStatic } from "npm:hono/deno";
import {env, _env, global, logger} from "../env.ts"

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
        global.PLUGINS_JSON = JSON.stringify(value.uiplugins).replace(/\$\$FQDN\$\$/g, env.CADDY__ALP__PUBLIC_FQDN);
    }
}