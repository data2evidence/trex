import { MriUser, isClientCredToken } from './MriUser.ts'
import { createLogger } from './Logger.ts'
import { createAuthc, AuthcType, exchangeToken, publicURLs } from './authentication/index.ts'
import { UserMgmtAPI } from "./api/UserMgmtAPI"
import { SqleditorAPI } from "./api/Sqleditor"
import { NextFunction, Request, Response,express } from 'npm:express'
import jwt from 'npm:jsonwebtoken'
import { env } from './env.ts'ß
import { ROLES } from './const.ts'
import { REQUIRED_URL_SCOPES, ROLE_SCOPES } from './scopes.ts'
import { IToken } from './types.d.ts'
import pako from 'npm:pako'

const subProp = env.GATEWAY_IDP_SUBJECT_PROP
const PUBLIC_API_PATHS = ['^/system-portal/dataset/public/list(.*)', '^/system-portal/config/public(.*)']

const auth = Deno.env.SKIP_AUTH === 'TRUE' ? false : true
const isDev = Deno.env.NODE_ENV === 'development'
const authType = env.GATEWAY_IDP_AUTH_TYPE as AuthcType
const userMgmtApi = new UserMgmtAPI()
const app = express()

const authc = createAuthc(app)


const logger = createLogger('gateway-auth')

function ensureAuthenticated(req, res, next) {
    if (!auth || publicURLs.some(url => req.originalUrl.startsWith(url))) {
      return next()
    }
  
    authc.authenticate(authType)(req, res, next)
  }
  
// Add sub to request.user as required by MriUser
export const addSubToRequestUserMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && !req.user['sub']) {
      const token = _getDecodedToken(req)
      if (token) {
        req.user['sub'] = token[subProp]
      }
    }
  
    return next()
  }

async function ensureAuthorized(req, res, next) {
    if (!auth) {
      return next()
    }
  
    const { originalUrl, method, user: token } = req
    const { oid, sub } = token
    const idpUserId = oid || sub
  
    const match = REQUIRED_URL_SCOPES.find(
      ({ path, httpMethods }) =>
        new RegExp(path).test(originalUrl) && (typeof httpMethods == 'undefined' || httpMethods.indexOf(method) > -1)
    )
  
    if (match) {
      let mriUserObj: any
  
      if (isClientCredToken(token)) {
        mriUserObj = new MriUser(token).adUserObject
      } else {
        try {
          const userGroups = await userMgmtApi.getUserGroups(req.headers.authorization, idpUserId)
          token.userMgmtGroups = userGroups
          mriUserObj = new MriUser(token).b2cUserObject
        } catch (error) {
          logger.error(error)
          return res.sendStatus(500)
        }
      }
  
      const { scopes } = match
      // the allowed scopes for a url should be found in the user's assigned scopes
      if (scopes.some(i => mriUserObj.mriScopes.includes(i))) {
        logger.info(`AUTHORIZED ACCESS: user ${mriUserObj.userId}, url ${originalUrl}`)
        if (isDev) {
          logger.info(`🚀 inside ensureAuthorized, req.headers: ${JSON.stringify(req.headers)}`)
        }
        return next()
      }
      logger.info(`inside ensureAuthorized: Forbidden, token does not have required scope`)
      return res.sendStatus(403)
    } else {
      return userMgmtApi.getUserGroups(req.headers.authorization, idpUserId).then(userGroups => {
        req.user.userMgmtGroups = userGroups
        return next()
      })
    }
  }

  export const checkScopes = async (req: Request, res: Response, next: NextFunction) => {
    const bearerToken = req.headers.authorization
    const { originalUrl, method } = req
    if (PUBLIC_API_PATHS.some(path => new RegExp(path).test(originalUrl))) {
      return next()
    } else if (!bearerToken) {
      logger.error(`No bearer token is found for url: ${originalUrl}`)
      return res.status(401).send()
    }
  
    try {
      const match = REQUIRED_URL_SCOPES.find(
        ({ path, httpMethods }) =>
          new RegExp(path).test(originalUrl) && (typeof httpMethods == 'undefined' || httpMethods.indexOf(method) > -1)
      )
  
      if (match) {
        const { scopes } = match
        const userScopes = await _getUserScopes(bearerToken, originalUrl)
        if (scopes.some(i => userScopes.includes(i))) {
          logger.debug(`User scopes allowed for url ${originalUrl}`)
          return next()
        }
      }
      logger.error(`User scopes not allowed for url ${originalUrl}`)
      return res.status(403).send()
    } catch (err) {
      logger.error(`Error during scope check: ${err}`)
      logger.error(err.stack)
      return res.status(500).send()
    }
  }
  
  export const checkScopesByQueryString = async (req: Request, res: Response, next: NextFunction) => {
    const bearerToken = req.query.token as string
    const { originalUrl, method } = req
    if (PUBLIC_API_PATHS.some(path => new RegExp(path).test(originalUrl))) {
      return next()
    } else if (!bearerToken) {
      logger.error(`No bearer token is found for url: ${originalUrl}`)
      return res.status(401).send()
    }
  
    try {
      const match = REQUIRED_URL_SCOPES.find(
        ({ path, httpMethods }) =>
          new RegExp(path).test(originalUrl) && (typeof httpMethods == 'undefined' || httpMethods.indexOf(method) > -1)
      )
  
      if (match) {
        const { scopes } = match
        const userScopes = await _getUserScopes(bearerToken, originalUrl)
        if (scopes.some(i => userScopes.includes(i))) {
          logger.debug(`User scopes allowed for url ${originalUrl}`)
          return next()
        }
      }
      logger.error(`User scopes not allowed for url ${originalUrl}`)
      return res.status(403).send()
    } catch (err) {
      logger.error(`Error during scope check: ${err}`)
      return res.status(500).send()
    }
  }
  
  const _getUserScopes = async (bearerToken: string, url: string) => {
    const token = jwt.decode(bearerToken.replace(/bearer /i, '')) as IToken
    const { client_id, grant_type } = token
    const sub = token[subProp]
    const ctxRoles: string[] = []
  
    if (grant_type === 'client_credentials' || sub === client_id) {
      ctxRoles.push(sub)
    } else {
      const ctxUserGroups = await userMgmtApi.getUserGroups(bearerToken, sub)
      if (ctxUserGroups.alp_role_user_admin === true) {
        ctxRoles.push(ROLES.ALP_USER_ADMIN)
      }
      if (ctxUserGroups.alp_role_system_admin === true) {
        ctxRoles.push(ROLES.ALP_SYSTEM_ADMIN)
      }
      if (ctxUserGroups.alp_role_alp_sqleditor_admin === true) {
        ctxRoles.push(ROLES.ALP_SQLEDITOR_ADMIN)
      }
      if (ctxUserGroups.alp_role_nifi_admin === true) {
        ctxRoles.push(ROLES.ALP_NIFI_ADMIN)
      }
      if (ctxUserGroups.alp_role_dashboard_viewer === true) {
        ctxRoles.push(ROLES.ALP_DASHBOARD_VIEWER)
      }
      if (ctxUserGroups.alp_role_tenant_viewer?.length > 0) {
        ctxRoles.push(ROLES.TENANT_VIEWER)
      }
      if (ctxUserGroups.alp_role_study_researcher?.length > 0) {
        for (const datasetId of ctxUserGroups.alp_role_study_researcher) {
          if (url.includes(datasetId) || url.includes('/system-portal/notebook') || url.includes('/terminology')) {
            ctxRoles.push(ROLES.STUDY_RESEARCHER)
            break
          }
        }
      }
    }
  
    const roleScopesMap: Map<string, string[]> = new Map(Object.entries(ROLE_SCOPES))
    const userScopes: string[] = []
    ctxRoles.forEach(ctxRole => {
      const roleScopes = roleScopesMap.get(ctxRole)
      if (roleScopes) {
        userScopes.push(...roleScopes)
      }
    })
    return Array.from(new Set(userScopes))
  }
  

const _getDecodedToken = (req: Request) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return null
  }
  const token = authHeader.replace(/bearer /i, '')
  const decodedToken = jwt.decode(token) as jwt.JwtPayload

  return decodedToken
}


function _convertZlibBase64ToJson(base64String: string) {
    try {
      return JSON.parse(
        pako.inflate(
          Buffer.from(base64String, 'base64')
            .toString('binary')
            .split('')
            .map(x => x.charCodeAt(0)),
          { to: 'string' }
        )
      )
    } catch (err) {
      throw new Error('There was en error converting the input to JSON')
    }
  }
  
  export const ensureAnalyticsDatasetAuthorized = async (req, res: Response, next: NextFunction) => {
    const allowedDatasets = req.user.userMgmtGroups.alp_role_study_researcher
    let dataset
  
    switch (req.method) {
      case 'GET':
        if (req.query && req.query.mriquery) {
          dataset = _convertZlibBase64ToJson(req.query.mriquery).selectedStudyEntityValue
        } else {
          const datasetKey = Object.keys(req.query)
            .filter(query => ['selectedStudyId', 'selectedStudyEntityValue', 'studyId'].includes(query))
            .toString()
          dataset = req.query[datasetKey]
        }
        break
  
      case 'POST':
        if (req.body.mriquery) {
          dataset = _convertZlibBase64ToJson(req.body.mriquery).selectedStudyEntityValue
        } else if (req.query.studyId) {
          dataset = req.query.studyId
        }
        break
    }
  
    if (dataset && !allowedDatasets.includes(dataset)) {
      logger.info(`inside ensureDatasetAuthorized: User does not have access to dataset`)
      return res.sendStatus(403)
    }
    return next()
  }
  
  export const ensureDataflowMgmtDatasetAuthorized = async (req, res: Response, next: NextFunction) => {
    // This middleware should be used after checkScopes
    // Skip dataset authorization check for admin role
    if (req.user.userMgmtGroups.alp_role_system_admin) return next()
  
    const allowedDatasets = req.user.userMgmtGroups.alp_role_study_researcher
    let dataset
  
    switch (req.method) {
      case 'GET':
        if (req.params && req.params.datasetId) {
          dataset = req.params.datasetId
        }
        break
  
      case 'POST':
        const { options } = req.body
        dataset = options?.datasetId
        break
    }
  
    if (dataset && !allowedDatasets.includes(dataset)) {
      logger.info(`inside ensureDatasetAuthorized: User does not have access to dataset`)
      return res.sendStatus(403)
    }
    return next()
  }
  
  export const ensureTerminologyDatasetAuthorized = async (req, res: Response, next: NextFunction) => {
    const allowedDatasets = req.user.userMgmtGroups.alp_role_study_researcher
    let dataset
  
    switch (req.method) {
      case 'GET':
        if (req.query && req.query.datasetId) {
          dataset = req.query.datasetId
        }
        break
  
      case 'POST':
        const { datasetId } = req.body
        dataset = datasetId
        break
    }
  
    if (dataset && !allowedDatasets.includes(dataset)) {
      logger.info(`inside ensureDatasetAuthorized: User does not have access to dataset`)
      return res.sendStatus(403)
    }
    return next()
  }
  
  export async function addSqleditorHeaders(req: Request, res, next) {
    const sqleditorToken = await new SqleditorAPI().getAccessToken()
    if (!sqleditorToken) return res.sendStatus(500)
  
    req.headers['authorization'] = `Bearer ${sqleditorToken}`
    return next()
  }

export const addMeilisearchHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Replace authorization header with meilisearch master key bearer token
  req.headers.authorization = `Bearer ${env.MEILI_MASTER_KEY}`
  return next()
}