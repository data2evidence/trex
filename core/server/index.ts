import { Hono } from "npm:hono";
import { logger as hlogger } from "npm:hono/logger";
import {env, logger} from "./env.ts"
import {addPortalRoute} from "./routes/portal.ts"
import {Plugins} from "./plugin/plugin.ts"
import { addBaseRoutes } from "./routes/base.ts";
import { addPluginRoutes} from "./routes/plugin.ts"

logger.log('🦖 TREX initializing 🦖');

const app = new Hono();
app.use(hlogger())

addBaseRoutes(app);
addPortalRoute(app);
await Plugins.initPlugins(app);
addPluginRoutes(app);


logger.log("Added plugins");
logger.log('🦖 TREX started 🦖');
Deno.serve(app.fetch);
