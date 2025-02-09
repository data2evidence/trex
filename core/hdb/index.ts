import * as hdb from "npm:hdb";
function flattenParameter(parameters:any) {
    try {
    const flatList: any = [];
    if (parameters) {
        parameters.forEach((p) => {
            flatList.push(p.value === undefined ? null : p.value);
        });
    }
    return flatList;

    } catch(e) {
        console.log("Error in flattenParameter")
        console.log(e)
    }
}



class HDBConnction {

    private static singleton: HDBConnction;
    private connections:any = {};
    private constructor() {
    }

    addConn(_conn:any) {
        const name:string = _conn.name;
        if(!(name in this.connections)) {
        this.connections[_conn.name] = hdb.createClient({
            host     : _conn.host,
            port     : _conn.port,
            user     : _conn.username,
            password : _conn.password
          });
          this.connections[_conn.name].on('error', function (err:any) {
            console.error('Network connection error', err);
            HDBConnction.singleton.connections[_conn.name].connect(function (err:any) {
                if (err) {
                    return console.error('Connect error', err);
                }
              }); 
          });
          this.connections[_conn.name].connect(function (err:any) {
            if (err) {
                return console.error('Connect error', err);
            }
          }); 
        }
    }

    static getConnection(_conn:any) {
        if(!HDBConnction.singleton) {
            HDBConnction.singleton = new HDBConnction();
        }
        HDBConnction.singleton.addConn(_conn);
        return HDBConnction.singleton;

    }

    executeBulkInsert(
        db:string,
        sql:any,
        parameters:any,
        callback:any,
      ) {
        // hdb-node module cannot accept empty strings for input into datetime columns, so replace all empty string with null values
        parameters = parameters.map((row:any) => {
          return row.map((val:any) => {
            return val === "" ? null : val;
          });
        });
    
        try {
          console.log(`Sql: ${sql}`);
          this.connections[db].prepare(sql, (err:any, statement:any) => {
            if (err) {
              console.error(
                `Execute error: ${JSON.stringify(err)})
                     => sql: ${sql}
                     => parameters: ${JSON.stringify(parameters)}`,
              );
              callback(err, null);
            } else {
              //Run bulk insert statement in chunks as hdb-node module will hang if doing bulk insert on large amounts of rows
              const rowCount = parameters.length;
              const chunkSize = 50000;
              const chunkCount = Math.ceil(rowCount / chunkSize);
    
              for (let j = 0; j < chunkCount; j++) {
                const start = j * chunkSize;
                const end = start > rowCount ? rowCount : (j + 1) * chunkSize;
                statement.exec(
                  parameters.slice(start, end),
                  (err:any, affectedRows:any) => {
                    if (err) {
                      console.error(`Error inserting chunk ${j + 1}`);
                      callback(err, null);
                    } else {
                    }
                    // Get number of rows inserted from affectedRows as it can either be array or number
                    const rowsInserted = Array.isArray(affectedRows)
                      ? affectedRows.length
                      : affectedRows;
                    console.log(
                      `Inserted ${rowsInserted} rows for chunk ${
                        j + 1
                      }/${chunkCount}`,
                    );
    
                    // After successfully loading all chunks
                    if (j + 1 === chunkCount) {
                      callback(null, true);
                    }
                  },
                );
              }
            }
          });
        } catch (err) {
          callback(err, null);
        }
      }
    
    
      prepareStatementAndExecute(
        db:string,
        sql:any,
        parameters:any,
        callback:any,
      ) {
        this.connections[db].prepare(sql, (err:any, statement:any) => {
          if (err) {
            console.error(`Execute error: ${JSON.stringify(err)}
                    =>sql: ${sql}
                    =>parameters: ${JSON.stringify(parameters)}`);
            callback(new Error(err, err.message), null);
          } else {
            statement.exec(flattenParameter(parameters), callback);
          }
        });
      }
    
      executeStreamQuery(
        db:string,
        sql:any,
        parameters:any,
        callback:any,
      ) {
        try {
          this.connections[db].prepare(sql, (err:any, statement:any) => {
            if (err) {
              console.error(`Execute error: ${JSON.stringify(err)}
                        =>sql: ${sql}
                        =>parameters: ${JSON.stringify(parameters)}`);
              callback(new Error(err, err.message), null);
            } else {
              statement.execute(flattenParameter(parameters), (err:any, rs:any) => {
                if (err) {
                  console.error(`Execute error: ${JSON.stringify(err)}
                                =>sql: ${sql}
                                =>parameters: ${JSON.stringify(parameters)}`);
                  callback(new Error(err, err.message), null);
                }
    
                const rsObjectStream = rs.createObjectStream().on("finish", () => {
                  if (!rs.closed) {
                    rs.close();
                  }
                });
    
                rsObjectStream.on("error", (err: any) => {
                  console.error(err);
                });
    
                callback(null, rsObjectStream);
              });
            }
          });
        } catch (err) {
          callback(err, null);
        }
      }
    
          /**
         * execute a stored procedure
         * Check if the out parameter is of table type.If yes, move it to outparameters ( key under the result object described below)
         * @param {DBCommandInterface} proc - object that contains the schema and procedure name
         * @param {Object[]} parameters - array of parameters
         * @param {dbCallback} callback - function to pass the results as an object comprising the resultset and out parameters in this format
         * result object Structure : { hdbResultSet : <array of results>,  //array of $.hdb.ResultSet returned by the stored procedure
         *                              outParameters : <Object keys of out parameters> //Out Parameters of the stored procedure
         *                          }
         */
          executeProc(
            db:string,
            procedure:any,
            args:any,
            callback:any,
          ) {
            try {
              const params = args.map((param:any) => "?");
              const sql = `CALL \"${procedure}\" (${params.join()})`;
              this.connections[db].prepare(sql, (err:any, statement:any) => {
                if (err) {
                  callback(new Error(err, err.message), null);
                  return;
                }
                statement.exec(args, (err:any, parameters:any, results:any) => {
                  if (err) {
                    callback(new Error(err, err.message), null);
                    return;
                  }
                  callback(null, results);
                });
              });
            } catch (err) {
              callback(err, null);
            }
          }
    
        }



Deno.serve(async (req: Request) => {
    const body = await req.json();
    const hdb = HDBConnction.getConnection(body);
    switch(body["fn"]) {
        case "executeProc":
            hdb.executeProc(body["name"], body["sql"], body["parameters"], (err:any,res:any) => {
                if(err) {
                    console.error(err);
                    return Response.json({"error": err});
                } else {
                    return Response.json(res);
                }
            })
            break;
        case "executeStreamQuery":
            hdb.executeStreamQuery(body["name"], body["sql"], body["parameters"], (err:any,res:any) => {
                if(err) {
                    console.error(err);
                    return Response.json({"error": err});
                } else {
                    return Response.json(res);
                }
            })
            break;
        case "prepareStatementAndExecute":
            hdb.prepareStatementAndExecute(body["name"], body["sql"], body["parameters"], (err:any,res:any) => {
                if(err) {
                    console.error(err);
                    return Response.json({"error": err});
                } else {
                    return Response.json(res);
                }
            })
            break;
        case "executeBulkInsert":
            hdb.executeBulkInsert(body["name"], body["sql"], body["parameters"], (err:any,res:any) => {
                if(err) {
                    console.error(err);
                    return Response.json({"error": err});
                } else {
                    return Response.json(res);
                }
            })
            break;
    }

    return Response.json({});
});