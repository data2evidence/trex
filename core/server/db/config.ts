import { env, logger } from '../env.ts'
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";

const sleep = (time: number) => {
  setTimeout(() => time, time)
}
/*
  let ssl: any = Boolean(env.PG_SSL)
  if (env.PG__CA_ROOT_CERT) {
    ssl = {
      rejectUnauthorized: true,
      ca: env.PG__CA_ROOT_CERT
    }
  }

  if (!env.PG__CA_ROOT_CERT && env.NODE_ENV === 'production') {
    logger.warn('PG_CA_ROOT_CERT is undefined')
  }*/

let config = {
    client: 'pg',
    connection: {
      host: env.PG__HOST,
      port: env.PG__PORT,
      database: env.PG__DB_NAME,
      user: env.PG__USER,
      password: env.PG__PASSWORD,
      ssl: env.PG__SSL ?? false
    },
    searchPath: [`trex`],
    migrations: {
      schemaName: 'trex',
      tableName: 'knex_migrations',
     // extension: 'mjs',
     // loadExtensions: ['.mjs'],
      directory: `${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/migrations` // relative path to directory containing the migration files 
    }
  }
/*
config.connection = async () => {
  if (env.NODE_ENV === 'development') {
    await sleep(30000)
  }

  return {
    host: env.PG__HOST,
    port: env.PG__PORT,
    database: env.PG__DB_NAME,
    user: env.PG__USER!,
    password: env.PG__PASSWORD!,
   // ssl
  }
}*/

export default config