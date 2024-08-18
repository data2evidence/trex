import { Request, Response } from 'npm:express'
import { createLogger } from '../Logger.ts'

const logger = createLogger('HealthCheck')

export const healthCheckMiddleware = async (_req: Request, res: Response): Promise<void> => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  }
  try {
    res.send(healthcheck)
  } catch (e) {
    healthcheck.message = e
    logger.error(e.message)
    res.send(503)
  }
}
