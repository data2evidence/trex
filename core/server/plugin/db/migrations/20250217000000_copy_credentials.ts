export async function up(knex: any): Promise<void> {
    const r = await knex.schema
        .withSchema('trex')
        .raw(`ALTER TABLE db ADD "authentication_mode" varchar NOT NULL DEFAULT 'Password'`);
    try {
        const k = await knex.schema
          .withSchema('trex')
          .raw(`insert into trex.db  (
              select d.name as id, max(d.host),max(d.port),max(d.name), max(d.dialect),JSON_AGG(c.*) as credentials, JSON_AGG(distinct v.name) as vocab_schemas, '[]' as publications, x.value as db_extra, d.authentication_mode  from db_credentials_mgr.db as d 
              join db_credentials_mgr.db_extra as x on x.db_id =d.id
                join db_credentials_mgr.db_credential as c on c.db_id =d.id 
                join db_credentials_mgr.db_vocab_schema as v on v.db_id =d.id group by d.name, x.value)`);
    } catch (e) {
        console.log(`20250217000000_copy_credentials: skipped insert`);
        console.log(e);
    }
    return r;
  }
  
  export async function down(knex: any): Promise<void> {
    return knex.schema
      .withSchema('trex').raw(`ALTER TABLE db DROP COLUMN "authentication_mode"`));
  }
  
  
  




;
