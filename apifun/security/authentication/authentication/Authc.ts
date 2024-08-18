import { Express } from 'npm:express'
import passport from 'npm:passport'
import { ExtractJwt, StrategyOptions, Strategy as JwtStrategy } from 'npm:passport-jwt'
import { createLogger } from '../Logger.ts'
import { env } from '../env.ts'
import jwksRsa from 'jwks-rsa'

export type AuthcType = 'logto'

export const publicURLs = [
  '/portalsvc/public-graphql',
  '/usermgmt/api/user-group/public',
  '/system-portal/dataset/public/list',
  '/system-portal/feature/list',
  '/system-portal/config/public/overview-description'
]

const logger = createLogger('AuthcConfig')

export const logtoAuthOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKeyProvider: jwksRsa.passportJwtSecret({
    jwksUri: `${env.LOGTO_ISSUER}/jwks`,
    handleSigningKeyError: (err, cb) => {
      logger.error(`Signing key error: [${err?.name}] ${err?.message} ${err?.stack}`)
      return cb(err)
    }
  }),
  issuer: `https://${env.GATEWAY_WO_PROTOCOL_FQDN}/oidc`,
  audience: [env.LOGTO_CLIENT_ID!, ...(env.LOGTO_AUDIENCES ? env.LOGTO_AUDIENCES.split(' ') : [])]
}

const authType = env.GATEWAY_IDP_AUTH_TYPE as AuthcType

export const createAuthc = (app: Express) => {
  const authc = new Authc();

  if (authType === 'logto') {
    authc.useLogto()
  }

  authc.initialize(app)

  return authc
}

export class Authc {
  private readonly logger = createLogger(this.constructor.name)

  useLogto(name: AuthcType = 'logto') {
    this.logger.info('Using Logto')
    passport.use(
      name,
      new JwtStrategy(logtoAuthOptions, (token, done) => {
        done(null, token)
      })
    )
  }

  authenticate(name: AuthcType) {
    this.logger.info(`Authenticate with ${name}`)
    return passport.authenticate(name, { session: false })
  }

  initialize(app: Express) {
    this.logger.info('Initializing...')
    app.use(passport.initialize())
    app.use(passport.session())
  }
}
