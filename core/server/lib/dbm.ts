import {env, logger} from "../env.ts"
import pg from "npm:pg"
import {Validator} from "npm:jsonschema"
import { dbSchema } from './schema.ts';
import { constants, privateDecrypt } from "node:crypto";
import * as base64 from "jsr:@std/encoding/base64";

export class DatabaseManager {

	private constructor() {
		const opt = {
			user: env.PG__USER,
			password: env.PG__PASSWORD,
			host: env.PG__HOST,
			port: parseInt(env.PG__PORT),
			database: env.PG__DB_NAME,
		  }
		this.pgclient = new pg.Client(opt);	
        this.trexdbm = Trex.DatabaseManager.getDatabaseManager();
    }

    private trexdbm;
	private pgclient;
    private insert_query = `INSERT INTO trex.db (id, host, port, "name", dialect, credentials, vocab_schemas, publications, db_extra ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;

    private static _dbm : DatabaseManager;

	public static async get() {
		if(!DatabaseManager._dbm) {
			DatabaseManager._dbm = new DatabaseManager();
            await DatabaseManager._dbm.pgclient.connect();
            const dbc = await DatabaseManager._dbm.getCredentialsDecrypted();
            DatabaseManager._dbm.trexdbm.setCredentials(dbc);

		}
		return DatabaseManager._dbm;
	}

    public async setCredentials(c: any) {
        const v = new Validator();
        v.validate(c, dbSchema);
        const params = [c.code, c.host, c.port, c.name, c.dialect, JSON.stringify(c.credentials), JSON.stringify(c.vocabSchemas) || null, JSON.stringify(c.publications) || null, JSON.stringify(c.extra) || null ];
        const r = await this.pgclient.query(this.insert_query, params);
        this.trexdbm.setCredentials(await this.getCredentialsDecrypted());
        return c.code;
    }

    public getPublications() {
        return this.trexdbm.getPublications();
    }

    public async getCredentials() {
        const r = await this.pgclient.query(`SELECT id as code, * from trex.db`);
        const result = r.rows.map((x:any) => {
                x.credentials = x.credentials.map((y:any) => { 
                    return {
                        username: y.username,
                        userScope: y.userScope,
                        serviceScope:y.serviceScope
                    };
                });
                return x;
            }
        )
        return result;
    }

   private  credentialsPrivateKey: string =
  env.DB_CREDENTIALS__PRIVATE_KEY!.replace(/\\n/g, "\n");

  private decrypt (encryptedValue: string)  {
  if (!encryptedValue) {
    console.error("Missing encrypted value from database credentials");
    //process.exit(3);
  }
  const privateKey = this.credentialsPrivateKey.replace(/\\n/g, "\n");

  let ret = ""
  const decoder = new TextDecoder()
  try {
    ret= decoder.decode(privateDecrypt(
      {
        key: privateKey,
        padding: constants.TREX_RSA_PKCS1_OAEP_SHA256_PADDING,
        oaepHash: "sha256",
      },
      base64.decodeBase64(encryptedValue)
  ));
  } catch(e) {
    console.log(e);
    throw new Error("decrypt failed");
  }
  return ret
};

    public async getCredentialsDecrypted() {
        const r = await this.pgclient.query(`SELECT id as code, * from trex.db`);
        const result = r.rows.map((x:any) => {
                x.credentials = x.credentials.map((y:any) => { 
                    return {
                        username: y.username,
                        userScope: y.userScope,
                        serviceScope:y.serviceScope,
                        password: this.decrypt(y.password).replace(y.salt, "")
                    };
                });
                return x;
            }
        )
        return JSON.parse(JSON.stringify(result));
    }


}