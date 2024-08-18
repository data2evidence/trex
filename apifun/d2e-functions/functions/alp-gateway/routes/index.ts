import express from 'npm:express'
import { Service } from 'npm:typedi'
import { DatasetRouter } from './DatasetRouter.ts'
import { DBRouter } from './DBRouter.ts'
import { FhirRouter } from './FhirRouter.ts'

class Routes {
  public router = express.Router()

  constructor(
    private readonly datasetRouter: DatasetRouter,
    private readonly dbRouter: DBRouter,
    private readonly fhirRouter: FhirRouter
  ) {
    this.router.use('/dataset', this.datasetRouter.router)
    this.router.use('/db', this.dbRouter.router)
    this.router.use('/fhir', this.fhirRouter.router)
  }
}

export default Routes
export * from './DashboardGateRouter.ts'
