import 'npm:reflect-metadata'
import * as dotenv from 'npm:dotenv'
import axios from 'npm:axios'
 
dotenv.config()
import { createProxyMiddleware } from 'npm:http-proxy-middleware'
import express from 'npm:express'

import { createLogger } from './Logger.ts'
import {routes as xsapp} from './xs-app.ts'
import { app } from './configure/app.ts'
import { probes } from './configure/probes.ts'
//import https from 'https'
import querystring from 'npm:query-string'
import type {  IRouteProp } from './types.d.ts'
import { env, services } from './env.ts'
import https from 'node:https'

import { setupGlobalErrorHandling } from './error-handler.ts'

const PORT = env.GATEWAY_PORT
const logger = createLogger('gateway')

const alp_version = Deno.env.ALP_RELEASE || 'locsaal'
logger.info(`🚀 ALP Gateway starting`)




const onProxyReq = (proxyReq, req) => {
  if (req.body) {
    const contentType = proxyReq.getHeader('Content-Type')

    const writeBody = (bodyData: string) => {
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
      proxyReq.write(bodyData)
    }

    if (contentType === 'application/json') {
      writeBody(JSON.stringify(req.body))
      logger.debug(`JSON body is written for proxy at url: ${req.originalUrl}`)
    }

    if (contentType === 'application/x-www-form-urlencoded') {
      writeBody(querystring.stringify(req.body))
      logger.debug(`Form body is written for proxy at url: ${req.originalUrl}`)
    }
  }
}

function getCreateMiddlewareOptions(serviceUrl: string) {
  return {
    target: {
      protocol: serviceUrl.split('/')[0],
      host: serviceUrl.split('/')[2].split(':')[0],
      port: serviceUrl.split('/')[2].split(':')[1],
      ...(services.dbCredentialsMgr.includes('localhost:')
        ? undefined
        : {
            ca: env.GATEWAY_CA_CERT
          })
    },
    secure: serviceUrl.includes('localhost:') ? false : true,
    proxyTimeout: 300000,
    changeOrigin: serviceUrl.includes('localhost:') ? false : true
  }
}

const routes = xsapp.routes as IRouteProp[]


// attach origin in all requests
//app.use(addOriginHeader)

// add request correlation ID for all requests
//app.use(addCorrelationIDToHeader)

app.get('/alp-gateway', (_req, res) => {
  logger.info('gateway: sending alp_version: ' + alp_version)
  console.log("####################################################################################")
  res.status(200).send(alp_version)
})

const authType = env.GATEWAY_IDP_AUTH_TYPE
export const _exchangeToken = async (params: URLSearchParams) => {
  let tokenUrl: string | undefined, clientSecret: string | undefined, resource: string | undefined
  if (authType === 'logto') {
    clientSecret = env.LOGTO_CLIENT_SECRET
    tokenUrl = env.LOGTO_TOKEN_URL
    resource = env.LOGTO_RESOURCE_API
  }

  if (!params.has('client_secret') && clientSecret) {
    params.append('client_secret', clientSecret)
  }

  if (!params.has('resource') && resource) {
    params.append('resource', resource)
  }

  if (!tokenUrl) {
    logger.error('Token URL is required to exchange token')
    return
  }

  const response = await axios.post(tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  })

  if (response.data?.error) {
    logger.error(`Error while exchanging token: ${JSON.stringify(response.data)}`)
  }
  return response.data
}

app.post('/oauth/token', async (req, res) => {
  logger.info('Exchange code with oauth token')

  const params = new URLSearchParams()
  Object.keys(req.body).forEach(key => {
    params.append(key, req.body[key])
  })

  try {
    const token = await _exchangeToken(params)
    return res.send(token)
  } catch (error) {
    logger.error(`Error when exchanging code with token: ${error}`)
    return res.sendStatus(500)
  }
})

routes.forEach((route: IRouteProp) => {
  try {

    const source = route.source
      .replace('/(.*)$', '')
      .replace('/(.*)', '')
      .replace('(.*)$', '')
      .replace('(.*)', '')
      .replace('^', '')

    switch (route.destination) {
      case 'sqleditor':
        app.use(
          source,
          createProxyMiddleware({
            target: services.sqlEditor,
            pathRewrite: { '^/alp-sqleditor': '' },
            changeOrigin: true,
            onProxyReq
          })
        )
        break
      case 'public-analytics-svc':
        app.use(
          source,
          createProxyMiddleware({
            target: services.analytics,
            proxyTimeout: 300000
          })
        )
        break
      case 'analytics-svc':
        app.use(
          source,
          express.json(),
          createProxyMiddleware({
            ...getCreateMiddlewareOptions(services.analytics),
            logLevel: 'debug',
            headers: { Connection: 'keep-alive' },
            onProxyReq: onProxyReq
          })
        )
        break
      case 'usermgmt':
        app.use(
          source,
          createProxyMiddleware(getCreateMiddlewareOptions(services.usermgmt))
        )
        break
      case 'db-credentials-mgr':
        app.use(
          source,
          createProxyMiddleware({
            ...getCreateMiddlewareOptions(services.dbCredentialsMgr),
            pathRewrite: path => path.replace('/db-credentials', '')
          })
        )
        break
      case 'system-portal':
        app.use(
          source,
          createProxyMiddleware({
            ...getCreateMiddlewareOptions(services.portalServer),
            pathRewrite: path => path.replace('/system-portal', '')
          })
        )
        break
      case 'dataflow-mgmt':
        app.use(
          source,

          express.json(),
          createProxyMiddleware({
            ...getCreateMiddlewareOptions(services.dataflowMgmt),
            pathRewrite: path => path.replace('/dataflow-mgmt', ''),
            onProxyReq: onProxyReq
          })
        )
        break
      case 'meilisearch-svc':
        app.use(
          source,
          createProxyMiddleware({
            target: services.meilisearch,
            proxyTimeout: 300000,
            pathRewrite: path => path.replace('/meilisearch-svc', '')
          })
        )
        break
      case 'bookmark-svc':
        app.use(
          source,

          createProxyMiddleware(getCreateMiddlewareOptions(services.bookmark))
        )
        break
      case 'alp-terminology-svc':
        app.use(
          source,

          express.json(),
          createProxyMiddleware({ ...getCreateMiddlewareOptions(services.terminology), onProxyReq: onProxyReq })
        )
        break
      case 'pa-config':
        app.use(
          source,
          createProxyMiddleware({
            ...getCreateMiddlewareOptions(services.paConfig),
            headers: { Connection: 'keep-alive' }
          })
        )
        break
      case 'cdw':
        app.use(
          source,
          createProxyMiddleware({
            ...getCreateMiddlewareOptions(services.cdw),
            headers: { Connection: 'keep-alive' }
          })
        )
        break
      case 'ps-config':
        app.use(
          source,

          createProxyMiddleware({
            ...getCreateMiddlewareOptions(services.psConfig),
            headers: { Connection: 'keep-alive' }
          })
        )
        break
      default:
        logger.info('ERROR: unknown destination')
        break
    }
  } catch (e) {
    logger.error(`Error: ${e}, route @ ${route.source}`)
  }
})

app.use('/check-liveness', probes.livenessProbe)
app.use('/check-readiness', probes.readinessProbe)

/*const apiRoutes = Container.get(Routes)
app.use(
  '/gateway/api',
  ensureAuthenticated,
  addSubToRequestUserMiddleware,
  ensureAlpSysAdminAuthorized,
  express.json(),
  checkScopes,
  apiRoutes.router
)8*/

//const dashboardGateRoutes = Container.get(DashboardGateRouter)
//app.use(dashboardGateRoutes.router)

/*if (env.SSL_PRIVATE_KEY === undefined || env.SSL_PUBLIC_CERT === undefined) {
  logger.error('Unable to launch ALP Gateway due to missing SSL env variable.')
  process.exit(1)
}*/

setupGlobalErrorHandling(app, logger)


app.listen(PORT)
console.log(`🚀 ALP Gateway started on port ${PORT}`)
