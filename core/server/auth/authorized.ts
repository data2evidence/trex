import {global} from "../env.ts"
import {MriUser, isClientCredToken } from "./MriUser.ts"
import { UserMgmtAPI} from "../api/UserMgmtAPI.ts"
//import { NextFunction, Request, Response } from 'express'
//import jwt from 'jsonwebtoken'

const isDev = true;
const logger = console;
//const userMgmtApi = new UserMgmtAPI()
//const subProp = env.GATEWAY_IDP_SUBJECT_PROP
const PUBLIC_API_PATHS = ['^/system-portal/dataset/public/list(.*)', '^/system-portal/config/public(.*)']


export async function ensureAuthorized(req, res, next) {
    const userMgmtApi = new UserMgmtAPI()
    const { originalUrl, method, user: token } = req
    const { oid, sub } = token
    const idpUserId = oid || sub
    const bearerToken = req.headers.authorization
    if (PUBLIC_API_PATHS.some(path => new RegExp(path).test(originalUrl))) {
      return next()
    } else if (!bearerToken) {
      logger.error(`No bearer token is found for url: ${originalUrl}`)
      return res.status(401).send()
    }

    const match = global.REQUIRED_URL_SCOPES.find(
      ({ path, httpMethods }) =>
        new RegExp(path).test(originalUrl) && (typeof httpMethods == 'undefined' || httpMethods.indexOf(method) > -1)
    )
  
    if (match) {
      let mriUserObj: any
  
      if (isClientCredToken(token)) {
        mriUserObj = new MriUser(token, global.ROLE_SCOPES).adUserObject
      } else {
        try {
          const userGroups = await userMgmtApi.getUserGroups(req.headers.authorization, idpUserId)
          token.userMgmtGroups = userGroups
          mriUserObj = new MriUser(token, global.ROLE_SCOPES).b2cUserObject
        } catch (error) {
          logger.error(error)
          return res.sendStatus(500)
        }
      }
  
      /*const userScopes = await getUserScopes(bearerToken, originalUrl)
      if (scopes.some(i => userScopes.includes(i))) {
        logger.debug(`User scopes allowed for url ${originalUrl}`)
        return next()
      }*/

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


  

  