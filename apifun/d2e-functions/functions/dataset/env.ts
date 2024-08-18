import { LoggingLevel } from './types.d.ts'

export const env = {
  GATEWAY_PORT:  5001,
  GATEWAY_LOG_LEVEL:  'info',
  GATEWAY_WO_PROTOCOL_FQDN:  'localhost:41100',
  GATEWAY_API_ALLOWED_DOMAINS:
    
    'http://localhost:9000 http://localhost:8080 https://localhost:5000 https://localhost:4000 https://localhost:5001 https://localhost:8080 https://localhost:4088',
  GATEWAY_IDP_AUTH_TYPE: '',
  GATEWAY_IDP_SUBJECT_PROP: '',

 GATEWAY_CA_CERT: '-----BEGIN CERTIFICATE-----\nMIIBmDCCAT2gAwIBAgIQKiNtyyiMoIXEsxuL0SSmojAKBggqhkjOPQQDAjAqMSgwJgYDVQQDEx9BTFAgSW50ZXJuYWwgQ0EgLSAyMDI0IEVDQyBSb290MB4XDTI0MDcxMjA5NDcxNFoXDTM0MDUyMTA5NDcxNFowKjEoMCYGA1UEAxMfQUxQIEludGVybmFsIENBIC0gMjAyNCBFQ0MgUm9vdDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABNMolGjzLrDhb0idz3NQNRbw7/9DZIsiNTJ+498WU5RbcfV7QHDYjFuXfIri6M2kgIFk/I01wbBs9wOp27Xgk/yjRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAGAQH/AgEBMB0GA1UdDgQWBBT+ugY8vbIwWC/s/h1QTlrVOdl+3DAKBggqhkjOPQQDAgNJADBGAiEAyerjD+kPaJUCBzBE2vnNPnnLT/AGdbgTiqYQeQakZpICIQC65wkrC0ADkyM5fBIi79Fdz/UvQa2Fb09RNkH54UdNaA==\n-----END CERTIFICATE-----',
SSL_PUBLIC_CERT: '-----BEGIN CERTIFICATE-----\nMIIBtjCCAVygAwIBAgIQfvysQPrFEAvzS8IanF3rdzAKBggqhkjOPQQDAjAqMSgwJgYDVQQDEx9BTFAgSW50ZXJuYWwgQ0EgLSAyMDI0IEVDQyBSb290MB4XDTI0MDcxMjA5NDcxNFoXDTI1MDcwNzA5NDcxNFowADBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABP13wcAA+NPfv37lPRmgnelNe/HcPAYfoNb2BaVWQT+/g6usvYuYZOcsys8hXFn6mHmkuz6WA/8eY7yiO6/V6zyjgY0wgYowDgYDVR0PAQH/BAQDAgeAMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAdBgNVHQ4EFgQUijiP05z5/INblOo+XGjMFucEjbYwHwYDVR0jBBgwFoAU/roGPL2yMFgv7P4dUE5a1TnZftwwGQYDVR0RAQH/BA8wDYILKi5hbHAubG9jYWwwCgYIKoZIzj0EAwIDSAAwRQIhANAJtsA+2ZqQxXLT4UOlwBlOSn7/nP5dH2JcA73dF0CKAiAU1kDD/2gQpdEYJ7OakNNCXNhBdH1r0xVsOKKt2tpJtQ==\n-----END CERTIFICATE-----',
SSL_PRIVATE_KEY: '-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIBLpPhO3ZLt3dy9MPNoV1loFuPYzJ97LRCLQPAije5aooAoGCCqGSM49AwEHoUQDQgAE/XfBwAD409+/fuU9GaCd6U178dw8Bh+g1vYFpVZBP7+Dq6y9i5hk5yzKzyFcWfqYeaS7PpYD/x5jvKI7r9XrPA==\n-----END EC PRIVATE KEY-----',
  APP_DEPLOY_MODE: '',  
IDP_ALP_SVC_CLIENT_ID: '',
  IDP_ALP_DATA_CLIENT_ID: '',
  IDP_RELYING_PARTY: '',
  LOGTO_CLIENT_ID: '',
  LOGTO_CLIENT_SECRET: '',
  LOGTO_ISSUER: '',
  LOGTO_TOKEN_URL: '',
  LOGTO_AUDIENCES: '',
  LOGTO_RESOURCE_API: '',
  LOGTO_SCOPE: '',
  LOGTO_SVC_CLIENT_ID: '',
  LOGTO_SVC_CLIENT_SECRET: '',
  SQLEDITOR__TECHNICAL_USERNAME: 'demo',
  SQLEDITOR__TECHNICAL_USER_PASSWD:  'demo',
  PLUGINS_JSON:  '{}',
  DB_CREDENTIALS_PUBLIC_KEYS: '',
  SERVICE_ROUTES: '{}',
  MEILI_MASTER_KEY: '',
  APP_LOCALE: '',
  FHIR_CLIENT_ID: 'x',
  FHIR_CLIENT_SECRET:  'y',
}

export const services = { "analytics": "https://alp.local:41102","bookmark": "https://alp-minerva-bookmark-svc:41110",   "cdw": "https://alp-minerva-cdw-svc:41114",       "paConfig": "https://alp-minerva-pa-config-svc:41113/pa-config-svc",       "psConfig": "https://alp-minerva-ps-config-svc:41115/ps-config-svc",       "queryGen": "https://alp-minerva-query-gen-svc:41109",       "dataflowMgmt": "https://alp-minerva-dataflow-mgmt:41107",       "dbCredentialsMgr": "https://alp-minerva-db-credentials-mgr:41112",       "meilisearch": "http://alp-minerva-meilisearch-svc:41111",       "portalServer": "https://alp-minerva-portal-server:41105",       "usermgmt": "https://alp-minerva-user-mgmt:41104/usermgmt/api",       "terminology": "https://alp-minerva-terminology-svc:41108",       "prefect": "http://alp-dataflow-gen:20/api",       "sqlEditor" : "http://alp-minerva-sqleditor:8888",       "appRouter": "https://alp-mercury-approuter:41000",       "idIssuerUrl": "http://alp-logto:3001/oidc",       "minio": "",       "fhir": "http://alp-minerva-fhir-server:8103",       "dicomServer": "http://alp-dicom-server:8042"      }
