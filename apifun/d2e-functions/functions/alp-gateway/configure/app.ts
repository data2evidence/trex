import express from 'npm:express'
import cookieParser from 'npm:cookie-parser'
import expressSession from 'npm:express-session'
import methodOverride from 'npm:method-override'
import morgan from 'npm:morgan'
import cors from 'npm:cors'
import { env } from '../env.ts'
import { configureStandalone } from './standalone.ts'

const app = express()

if (Deno.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}
app.use(morgan('combined'))
app.use(methodOverride())
app.use(cookieParser())

app.use(
  expressSession({
    name: 'app-gateway',
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'none',
      secure: Deno.env.NODE_ENV === 'production'
    }
  })
)
app.use(express.urlencoded({ extended: true }))

const API_ALLOWED_DOMAINS = env.GATEWAY_API_ALLOWED_DOMAINS

const whitelist = API_ALLOWED_DOMAINS.split(/\s+/)
const corsOptions = {
  origin: (origin, callback) => {
    // !origin will allow Postman calls
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      console.error(`Invalid origin ${origin} detected!`)
      callback(new Error('Invalid origin detected!'))
    }
  }
}
app.use(cors(corsOptions))

configureStandalone(app)

export { app, authc }
