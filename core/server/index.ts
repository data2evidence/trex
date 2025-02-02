import { Hono } from "npm:hono";
import { logger as hlogger } from "npm:hono/logger";
import {logger} from "./env.ts"
import {Plugins} from "./plugin/plugin.ts"
import { KnexMigration } from './plugin/db.ts';
import { DatabaseManager } from './lib/dbm.ts';

export async function initTrex() {
    logger.log('🦖 TREX initializing 🦖');
    const app: Hono = new Hono();
    app.use(hlogger())
    await DatabaseManager.get();
    for await (const r of Deno.readDir("./core/server/routes")) {
        logger.log(`Add Routes ${r.name}`)
        const module = await import(`./routes/${r.name}`);
        module.addRoutes(app);

    }
    await Plugins.initPlugins(app);
    logger.log("Added plugins");
    logger.log('🦖 TREX started 🦖');
    Deno.serve(app.fetch);
}

logger.log('🦖 TREX DB initializing 🦖');
await new KnexMigration('trex', "../db/migrations", null).initalizeDataSource();
await initTrex();
