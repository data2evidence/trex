import knex from "npm:knex";
import config from "../db/config.ts";
import { MigrationSource } from "../db/MigrationSource.ts";

export class InitDB {
  private k = knex(config);

  public async initalizeDataSource() {
    console.log("Initializing DataSource...");
    try {
      console.log(">>> Running Migrations <<<");
      const migrationResult = await this.k.migrate.latest({ migrationSource: new MigrationSource() });
      console.log("Migrations Done:", migrationResult);

      console.log(">>> Initialization Complete <<<");
    } catch (error) {
      console.error("Error during DataSource initialization:", error);
    } finally {
      await this.k.destroy();
    }
  }
}