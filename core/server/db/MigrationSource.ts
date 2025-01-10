import * as path from "https://deno.land/std@0.188.0/path/mod.ts";

export class MigrationSource {

    async getMigrations() {
      const files = Deno.readDir(`${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/migrations`);
      let res = []
      for await (const f of files) {
        res.push(f.name)
      }

      return Promise.resolve(res.sort());
    }
  
    getMigrationName(migration) {
      return migration.slice(0,-2)+"js";
    }
  
    getMigration(migration)  {
          return import(`./migrations/${migration}`);
    }
  }
  