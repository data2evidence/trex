import https from 'node:https'
import { env } from '../env.ts'
import { AuthcType } from './Authc.ts'
import { createLogger } from '../Logger.ts'
import { OpenIDAPI } from '../api/OpenIDAPI.ts'
import { post } from '../api/request-util.ts'

const logger = createLogger('TokenHandler')
const authType = env.GATEWAY_IDP_AUTH_TYPE as AuthcType

export const getClientCredentialsToken = async () => {
  let clientId: string | undefined,
    clientSecret: string | undefined,
    scope: string = ''

  if (authType === 'logto') {
    clientId = env.LOGTO_SVC_CLIENT_ID
    clientSecret = env.LOGTO_SVC_CLIENT_SECRET
    scope = 'openid'
  }

  if (!clientId || !clientSecret) {
    logger.error('Client ID and secret is required to acquire token')
    return
  }

  const client = new OpenIDAPI({ issuerUrl: `https://${env.GATEWAY_WO_PROTOCOL_FQDN}/oauth/` })
  return await client.getClientCredentialsToken({ clientId, clientSecret, scope })
}


