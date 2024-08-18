import express from 'npm:express'
import { createLogger } from './Logger.ts'
import { FhirAPI } from './FhirApi.ts'

export class FhirRouter {
  public router = express()
  private readonly logger = createLogger(this.constructor.name)
  private fhirApi = new FhirAPI()

  constructor() {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.post('/', async (req, res) => {
      const { name, description } = req.body
      try {
        const newProject = await this.fhirApi.createProject(name, description)
        return res.status(200).json(newProject)
      } catch (error) {
        throw new Error(`Error creating new project: ${error}`)
      }
    })
  }
}

export const x = new FhirRouter();
