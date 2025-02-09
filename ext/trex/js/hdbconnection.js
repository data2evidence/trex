const createWorker = async (servicePath) => {
    const memoryLimitMb = 150;
    const workerTimeoutMs = 100000;
    const noModuleCache = false;
    const importMapPath = null;
    const envVarsObj = Deno.env.toObject();
    const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]);
    const forceCreate = true;
    const netAccessDisabled = false;
    const cpuTimeSoftLimitMs = 10000;
    const cpuTimeHardLimitMs = 20000;

    return await Trex.userWorkers.create({
        servicePath,
        memoryLimitMb,
        workerTimeoutMs,
        noModuleCache,
        importMapPath,
        envVars,
        forceCreate,
        netAccessDisabled,
        cpuTimeSoftLimitMs,
        cpuTimeHardLimitMs,
        // maybeEszip,
        // maybeEntrypoint,
        // maybeModuleCode,
    });
};




export class HanaConnection  {
    schemaName;
    vocabSchemaName;
    dialect;
    #servicePath;
    
    constructor(
        conn,
      schemaName,
      vocabSchemaName,
    ) {
        this.schemaName = schemaName;
        this.vocabSchemaName = vocabSchemaName;
        this.dialect = 'hana';
        this.#servicePath = "./core/hdb";
    }


    async #callWorker(call, cb) {
        try {
            // If a worker for the given service path already exists,
            // it will be reused by default.
            // Update forceCreate option in createWorker to force create a new worker for each request.
            const worker = await createWorker(this.#servicePath);
            const controller = new AbortController();
    
            const signal = controller.signal;
            // Optional: abort the request after a timeout
            //setTimeout(() => controller.abort(), 2 * 60 * 1000);
            const req = new Request("/", {method: "POST", body: JSON.stringify(call)})
            cb(null, await worker.fetch(req, { signal }));
        } catch (e) {
            console.error(e);
    
            if (e instanceof Deno.errors.WorkerRequestCancelled) {
                headers.append('Connection', 'close');
            }
    
            rcb(e.toString(),null);
        }
    };

    #callUserWorker(params, cb) {
        this.#callWorker(params, cb);
    }

    executeStreamQuery(sql2,
        parameters,
        callback,
        schemaName = "",) {
            const sql = this.getSqlStatementWithSchemaName(schemaName, sql2);
            const call = {fn:"executeStreamQuery", sql: sql, parameters:parameters};
            this.#callUserWorker(call, callback);
    }

    executeProc(sql, args, callback) {
        const call = {fn:"executeProc", sql: sql, parameters:args};

        this.#callUserWorker(call, callback);
    }

    prepareStatementAndExecute(sql, parameters, callback) {
        const call = {fn:"prepareStatementAndExecute", sql: sql, parameters:parameters};
        this.#callUserWorker(call, callback);
    }
    executeBulkInsert( sql,
        parameters,
        callback) {
            const call = {fn:"executeBulkInsert", sql: sql, parameters:parameters};
            this.#callUserWorker(call, callback);
        }

  
    execute(
      sql,
      parameters,
      callback,
      schemaName = "",
    ) {
      try {
        console.log(
          `Before execute, DB connection state: `,
        );
        sql = this.getSqlStatementWithSchemaName(schemaName, sql);
  
        this.prepareStatementAndExecute(sql, parameters, callback);
        
      } catch (err) {
        callback(new DBError(logger.error(err), err.message), null);
      }
    }
  
    getTranslatedSql(sql, schemaName, parameters) {
      return this.getSqlStatementWithSchemaName(schemaName, sql);
    }
  

  
    executeQuery(
      sql,
      parameters,
      callback,
      schemaName = "",
    ) {
      try {
        this.execute(
          sql,
          parameters,
          (err, resultSet) => {
            if (err) {
              console.error(err);
              callback(err, null);
            } else {
              console.log(`${JSON.stringify(resultSet, null, 2)}`);
              const result = this.parseResults(resultSet, resultSet.metadata);
              callback(null, result);
            }
          },
          schemaName,
        );
      } catch (err) {
        callback(new DBError(logger.error(err), err.message), null);
      }
    }
  

  
    executeUpdate(
      sql,
      parameters,
      callback,
    ) {
      try {
        this.execute.apply(this, arguments);
      } catch (err) {
        callback(new DBError(logger.error(err), err.message), null);
      }
    }
  

  
    commit(callback) {
      /*this.conn.commit(commitError => {
        if (commitError) {
          throw commitError;
        }
        if (callback) {
          callback(
            new DBError(logger.error(commitError), commitError.message),
            null,
          );
        }
      });*/
        callback("not implemented", null);

    }
  
    setAutoCommitToFalse() {
      //this.conn.setAutoCommit(false);
    }
  
    rollback(callback) {
      /*this.conn.rollback(err => {
        if (err) {
          err.code = "ECOMMIT";
          return callback(new DBError(err.code, err.message), null);
        } else {
          callback(null, true);
        }
      });*/
      callback("not implemented", null);
    }
  
    /**
     * Parses resultset, only converting null column values to 'NoValue'. Not converting the
     * other types since there is NO resultset metadata available.
     * @param resultSet - result set from db call
     * @param metadata - not required, can be null
     */
    parseResults(result, metadata) {
      function formatResult(columnKey, value) {
        if (!metadata) {
          return value;
        }
  
        switch (getType(columnKey)) {
          case 1: //TINYINT
          case 2: //SMALLINT
          case 3: //INTEGER
          case 4: //BIGINT
          case 5: //DECIMAL
          case 6: //REAL
            return Number(value);
          case 14: //DATE
            return `${value}T00:00:00.000Z`;
          case 16: //TIMESTAMP
            if (value.indexOf(".") > -1) {
              return `${value}Z`;
            } else {
              return `${value}.000Z`;
            }
          case 62: //SECONDDATE
            return `${value}.000Z`;
          case 15: //TIME
            return value;
          case 13: //VARBINARY
            return value.toString("hex").toUpperCase();
          case 26: // LOB
            return value.toString();
          default:
            return value;
        }
      }
  
      function getType(columnKey) {
        for (const md of metadata) {
          if (md.columnDisplayName === columnKey) {
            return md.dataType;
          }
        }
      }
  
      Object.keys(result).map(rowId => {
        Object.keys(result[rowId]).map(colKey => {
          if (
            result[rowId][colKey] === null ||
            typeof result[rowId][colKey] === "undefined"
          ) {
            result[rowId][colKey] = DBValues.NOVALUE;
          } else {
            result[rowId][colKey] = formatResult(colKey, result[rowId][colKey]);
          }
        });
      });
  
      return result;
    }
  
    close() {
      /*if (this.conn.readyState !== "closed") {
        this.conn.close();
      }
      console.log(
        `After closing connection, DB connection state`,
      );*/
    }
  
    executeBulkUpdate(
      sql,
      parameters,
      callback,
    ) {
      throw new Error("executeBulkUpdate is not yet implemented");
    }
  

  
    /**
     * This methods sets the current application user to the DB session (i.e. SESSION_CONTEXT).
     * This method must be called in the respective endpoints before performing any queries involving the guarded patients.
     */
    setCurrentUserToDbSession(user, cb) {
      try {
        const query = `SET '${DBValues.DB_APPUSER_KEY}' = '${user}'`;
        this.executeUpdate(query, [], cb);
      } catch (e) {
        cb(e, null);
      }
    }
  
    /**
     * This methods sets the dataset release date to the DB session (i.e. SESSION_CONTEXT).
     * This method must be called in the respective endpoints before performing any queries against the datasets.
     */
    setTemporalSystemTimeToDbSession(
      systemTime,
      cb,
    ) {
      // if the dataset release date is not send, initialize system time with current data (UTC format)
      if (!systemTime) {
        systemTime = new Date().toISOString();
      }
      try {
        const query = `SET '${DBValues.DB_TEMPORAL_SYSTEM_TIME}' = '${systemTime}'`;
        this.executeUpdate(query, [], cb);
      } catch (e) {
        cb(e, null);
      }
    }
  
    getSqlStatementWithSchemaName(
      schemaName,
      sql,
    ) {
      const replacement = schemaName === "" ? "" : `${schemaName}.`;
      return sql.replace(/\$\$SCHEMA\$\$./g, replacement);
    }
  }