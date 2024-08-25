import {env} from "../env.ts"
import {MriUser, isClientCredToken } from "./MriUser.ts"
import { UserMgmtAPI} from "../api/UserMgmtAPI.ts"

const isDev = true;
const logger = console;

export const REQUIRED_URL_SCOPES = [
  {
    path: '^/analytics-svc/plugins/(.*)',
    scopes: ['PA.svc']
  },
  {
    path: '^/analytics-svc/api/services/population/studies/patientcount',
    scopes: ['PA.DatasetOverview.svc']
  },
  {
    path: '^/analytics-svc/api/services/(fhir|data|datastream|userStudies)/(?!schema)(.*)',
    scopes: ['PA.svc']
  },
  {
    path: '^/analytics-svc/api/services/((?!fhir)|data|datastream|userStudies|values)(.*)',
    scopes: ['PA.svc']
  },
  {
    path: '^/analytics-svc/pa/services(.*)',
    scopes: ['PA.svc']
  },
  {
    path: '^/pa-config-svc/enduser(.*)',
    scopes: ['PAConfig.svc', 'PAConfig.svc/read', 'PA.Score.svc']
  },
  {
    path: '^/pa-config-svc/services/(.*)',
    scopes: ['PAConfig.svc']
  },
  {
    path: '^/hc/hph/cdw/config/services/config.xsjs(.*)',
    scopes: ['CDWConfig.svc/read', 'CDWConfig.svc'],
    httpMethods: ['GET']
  },
  {
    path: '^/hc/hph/cdw/config/services/config.xsjs(.*)',
    scopes: ['CDWConfig.svc']
  },
  {
    path: '^/hc/hph/cdw/(.*)$',
    scopes: ['CDWConfig.svc']
  },
  {
    path: '^/hc/hph/config/services/(global|config).xsjs(.*)',
    scopes: ['CDWConfig.svc']
  },
  {
    path: '^/ps-config-svc/(.*)',
    scopes: ['PSConfig.svc']
  }
]

export async function ensureAuthorized(req, res, next) {
    const userMgmtApi = new UserMgmtAPI()
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