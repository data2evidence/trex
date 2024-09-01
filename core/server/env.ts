export const _env = Deno.env.toObject();
export let global = {
    REQUIRED_URL_SCOPES: [],
    ROLE_SCOPES: {},
    PLUGINS_JSON: {}
}

export let logger = {log: (c) =>  console.log(c), error: (c) => console.error(c)};


//console.log(_env.SERVICE_ENV)
export const env = {
    PRFECT_API_URL: _env.PREFECT_API_URL,
    TLS__INTERNAL__CRT: _env.TLS__INTERNAL__CRT?.replace(/\\n/g, '\n'),
    TLS__INTERNAL__KEY: _env.TLS__INTERNAL__KEY?.replace(/\\n/g, '\n'),
    TLS__INTERNAL__CA_CRT: _env.TLS__INTERNAL__CA_CRT?.replace(/\\n/g, '\n'),
    SERVICE_ROUTES: JSON.parse(_env.SERVICE_ROUTES),
    GATEWAY_WO_PROTOCOL_FQDN: _env.GATEWAY__WO_PROTOCOL_FQDN || "localhost:41100",
    LOGTO_CLIENT_ID: _env.LOGTO__CLIENT_ID,
    LOGTO_SCOPE: _env.LOGTO__SCOPE,
    APP_LOCALE: _env.APP_LOCALE,
    IDP_RELYING_PARTY: _env.IDP__RELYING_PARTY,
   // PLUGINS_JSON: _env.PLUGINS__JSON,
    DB_CREDENTIALS_PUBLIC_KEYS: _env.DB_CREDENTIALS__PUBLIC_KEYS,
    GATEWAY_IDP_AUTH_TYPE: _env.GATEWAY__IDP_AUTH_TYPE,
    LOGTO_ISSUER: _env.LOGTO__ISSUER,
    LOGTO_AUDIENCES: _env.LOGTO__AUDIENCES,
    LOGTO_SVC_CLIENT_ID: _env.LOGTO__SVC_CLIENT_ID,
    LOGTO_SVC_CLIENT_SECRET: _env.LOGTO__SVC_CLIENT_SECRET,
    NODE_ENV: _env.NODE_ENV,
    _FORCE_CREATE: _env.WATCH_FUNCTIONS || false,
    LOGTO_CLIENT_SECRET: _env.LOGTO__CLIENT_SECRET,
    LOGTO_TOKEN_URL: _env.LOGTO__TOKEN_URL,
    LOGTO_RESOURCE_API: _env.LOGTO__RESOURCE_API,
    GATEWAY_IDP_SUBJECT_PROP: _env.GATEWAY__IDP_SUBJECT_PROP,
    BASE_PATH: _env.PLUGIN_BASE_PATH || "./plugins/node_modules",
    REP_PG: _env.REP_PG,
    PREFECT_DOCKER_NETWORK: "alp_data",
    PREFECT_POOL: "docker-pool",
    SERVICE_ENV: JSON.parse(_env.SERVICE_ENV),
    CADDY__ALP__PUBLIC_FQDN: _env.CADDY__ALP__PUBLIC_FQDN || 'localhost:41100',
    PREFECT_HEALTH_CHECK: _env.PREFECT_API_URL

}
console.log(env);

