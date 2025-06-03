import { existsSync } from "ext:deno_node/_fs/_fs_exists.ts";

export const DUCKDB_FILE_DATABASE_CODE = "cdw_config_svc";
export const DUCKDB_FILE_SCHEMA_NAME = "validation_schema";

const DYNAMICALLY_GENERATED_DIR = "/usr/src/cdw_data/dynamically_generated";
const BUILT_IN_DIR = "/usr/src/cdw_data/built_in";

export const resolve_cdw_config_duckdb_file_path = () => {
  /*
		Checks if there is a duckdb file in BUILT_IN_DIR, if there is a file there, use it.
		Else fallback to using the built in duckdb file in DYNAMICALLY_GENERATED_DIR
		*/
  const duckdb_file_name = `${DUCKDB_FILE_DATABASE_CODE}_${DUCKDB_FILE_SCHEMA_NAME}`;
  const default_duckdb_file_path = `${DYNAMICALLY_GENERATED_DIR}/${duckdb_file_name}`;

  if (existsSync(default_duckdb_file_path)) {
    console.log(
      `Using dynamically generated duckdb file from ${DYNAMICALLY_GENERATED_DIR}`
    );
    return default_duckdb_file_path;
  } else {
    console.log(`Using built in duckdb file from ${BUILT_IN_DIR}`);
    return `${BUILT_IN_DIR}/${duckdb_file_name}`;
  }
};
