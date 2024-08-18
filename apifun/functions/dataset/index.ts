import express from 'npm:express'
import { CDMSchemaTypes, DbDialect } from './const.ts'
import { Service } from 'npm:typedi'
import { createLogger } from './Logger.ts'
import { v4 as uuidv4 } from 'npm:uuid'
import { PortalAPI } from './PortalAPI.ts'
import { AnalyticsSvcAPI } from './AnalyticsSvcAPI.ts'
import { DataflowMgmtAPI } from './DataflowMgmtAPI.ts'
import { generateDatasetSchema } from './GenerateDatasetSchema.ts'
import { env } from './env.ts'

const GATEWAY_WO_PROTOCOL_FQDN = env.GATEWAY_WO_PROTOCOL_FQDN!

@Service()
export class DatasetRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor() {
    this.registerRoutes()
  }

  private schemaCase(schemaName: string, dialect: DbDialect) {
    switch (dialect) {
      case DbDialect.Hana:
        return schemaName.toUpperCase()
      case DbDialect.Postgres:
        return schemaName.toLowerCase()
      default:
        return schemaName
    }
  }

  private flowSnapshotType(snapshotLocation: string) {
    if (snapshotLocation === 'DB') {
      return 'create_snapshot'
    } else {
      return 'create_parquet_snapshot'
    }
  }

  private registerRoutes() {
    this.router.get('/:sourceDatasetId/cdm-schema/snapshot/metadata', async (req, res) => {
      const token = req.headers.authorization!
      const portalAPI = new PortalAPI(token)
      const analyticsSvcAPI = new AnalyticsSvcAPI(token)

      const { sourceDatasetId } = req.params
      const { dialect, databaseCode, schemaName } = await portalAPI.getDataset(sourceDatasetId)

      try {
        const metadata = await analyticsSvcAPI.getCdmSchemaSnapshotMetadata(dialect, databaseCode, schemaName)
        return res.status(200).json(metadata)
      } catch (error) {
        this.logger.error(`Error when getting CDM schema snapshot metadata: ${JSON.stringify(error)}`)
        res.status(500).send('Error when getting CDM schema snapshot metadata')
      }
    })

    this.router.get('/:sourceDatasetId/cohorts', async (req, res) => {
      const { sourceDatasetId } = req.params

      try {
        const analyticsSvcAPI = new AnalyticsSvcAPI(req.headers.authorization!)
        const result = await analyticsSvcAPI.getAllCohorts(sourceDatasetId)
        return res.status(200).json(result)
      } catch (error) {
        this.logger.error(`Error when getting cohorts: ${JSON.stringify(error)}`)
        res.status(500).send('Error when getting cohorts')
      }
    })

    this.router.post('/', generateDatasetSchema, async (req, res) => {
      const token = req.headers.authorization!
      const portalAPI = new PortalAPI(token)
      const dataflowMgmtAPI = new DataflowMgmtAPI(token)

      const id = uuidv4()
      const {
        type,
        tokenStudyCode,
        tenantId,
        schemaOption,
        vocabSchemaValue,
        cleansedSchemaOption,
        tenantName,
        dialect,
        databaseCode,
        schemaName,
        dataModel: dataModelName,
        paConfigId,
        visibilityStatus,
        detail,
        dashboards,
        attributes,
        tags,
        fhirProjectId
      } = req.body

      const dataModel = dataModelName.split(' ')[0]

      if (!tenantName) {
        this.logger.error(`Tenant name is not provided`)
        return res.status(400).send('Tenant name is not provided')
      }
      // Token study code validation
      const tokenFormat = /^[a-zA-Z0-9_]{1,80}$/
      if (!tokenStudyCode.match(tokenFormat)) {
        this.logger.error(`Token dataset code ${tokenStudyCode} has invalid format`)
        return res.status(400).send('Token dataset code format is invalid')
      } else if (await portalAPI.hasDataset(tokenStudyCode)) {
        this.logger.error(`Provided token dataset code ${tokenStudyCode} is already used`)
        return res.status(400).send('Token dataset code is already used')
      }

      try {
        this.logger.info(`Create dataset ${id}`)
        const vocabSchema = vocabSchemaValue ? vocabSchemaValue : schemaName

        // Create CDM & Custom schemas with Optional Cleansed Schema
        if (schemaOption != CDMSchemaTypes.NoCDM && schemaName) {
          if (schemaOption == CDMSchemaTypes.CreateCDM || schemaOption == CDMSchemaTypes.CustomCDM) {
            try {
              this.logger.info(
                `Create CDM schema ${schemaName} with ${dataModel} on ${databaseCode} with cleansed schema option set to ${cleansedSchemaOption}`
              )

              const dataModels = await dataflowMgmtAPI.getDatamodels()
              const dataModelInfo = dataModels.find(model => model.name === dataModelName)

              const options = {
                options: {
                  flow_action_type: 'create_datamodel',

                  database_code: databaseCode,
                  data_model: dataModel,
                  schema_name: schemaName,
                  cleansed_schema_option: cleansedSchemaOption,
                  vocab_schema: vocabSchema
                }
              }

              await dataflowMgmtAPI.createFlowRunByMetadata(
                options,
                'datamodel',
                dataModelInfo.flowId,
                `datamodel-create-${schemaName}`
              )
            } catch (error) {
              this.logger.error(`Error while creating new CDM schema! ${error}`)
              return res.status(500).send('Error while creating CDM schema')
            }
          }
        }

        this.logger.info('Creating new dataset in Portal')
        const newDatasetInput = {
          id,
          type,
          tokenDatasetCode: tokenStudyCode,
          schemaOption,
          dialect,
          databaseCode: databaseCode,
          schemaName,
          vocabSchemaName: vocabSchema,
          dataModel: dataModelName,
          tenantId,
          paConfigId,
          visibilityStatus,
          detail,
          dashboards,
          attributes,
          tags,
          fhir_project_id: fhirProjectId
        }
        const newDataset = await portalAPI.createDataset(newDatasetInput)
        if (newDataset.error) {
          return res.status(400).json(newDataset)
        }
        return res.status(200).json(newDataset)
      } catch (error) {
        this.logger.error(`Error while creating dataset: ${JSON.stringify(error)}`)
        res.status(500).send('Error while creating dataset')
      }
    })

    this.router.post('/snapshot', async (req, res) => {
      const token = req.headers.authorization!
      const portalAPI = new PortalAPI(token)
      const dataflowMgmtAPI = new DataflowMgmtAPI(token)

      const { sourceStudyId, newStudyName, snapshotLocation, snapshotCopyConfig, dataModel: dataModelName } = req.body
      const { dialect, databaseCode, schemaName, vocabSchemaName } = await portalAPI.getDataset(sourceStudyId)

      const sourceHasSchema = schemaName.trim() !== ''
      const id = uuidv4()
      const newSchemaName = sourceHasSchema ? `CDM${id}`.replace(/-/g, '') : ''

      const dataModel = dataModelName.split(' ')[0]
      const dataModels = await dataflowMgmtAPI.getDatamodels()
      const dataModelInfo = dataModels.find(model => model.name === dataModelName)

      try {
        const snapshotRequest = {
          id,
          sourceDatasetId: sourceStudyId,
          newDatasetName: newStudyName,
          schemaName: newSchemaName,
          timestamp: new Date()
        }

        // Copy schema if it exist
        if (sourceHasSchema) {
          this.logger.info(
            `Copy CDM schema from ${schemaName} to ${newSchemaName} with config: (${JSON.stringify(
              snapshotCopyConfig
            )})`
          )

          try {
            const options = {
              options: {
                flow_action_type: this.flowSnapshotType(snapshotLocation),
                database_code: databaseCode,
                data_model: dataModel,
                schema_name: this.schemaCase(newSchemaName, dialect as DbDialect),
                source_schema: this.schemaCase(schemaName, dialect as DbDialect),
                dialect: dialect,
                vocab_schema: vocabSchemaName,
                snapshot_copy_config: snapshotCopyConfig
              }
            }

            await dataflowMgmtAPI.createFlowRunByMetadata(
              options,
              'datamodel',
              dataModelInfo.flowId,
              `datamodel-snapshot-${schemaName}`
            )
          } catch (error) {
            this.logger.error(`Error copying CDM schema! ${error}`)
            throw new Error(`Error copying CDM schema! ${error}`)
          }
        }

        this.logger.info('Copying dataset in Portal')
        const newDataset = await portalAPI.copyDataset(snapshotRequest)
        return res.status(200).json(newDataset)
      } catch (error) {
        this.logger.error(`Error when copying dataset: ${JSON.stringify(error)}`)
        res.status(500).send('Error when copying dataset')
      }
    })

    this.router.get('/:datasetId/dashboard/list', async (req, res) => {
      const { datasetId } = req.params
      try {
        const token = req.headers.authorization!
        const portalAPI = new PortalAPI(token)
        const dataset = await portalAPI.getDataset(datasetId)
        const mapped = dataset.dashboards.map(({ id, name }) => {
          const url = `https://${GATEWAY_WO_PROTOCOL_FQDN}/dashboard-gate/${id}/content?token=${token}`
          return { name, url }
        })
        return res.status(200).json(mapped)
      } catch (error) {
        this.logger.error(`Error when getting dashboards: ${JSON.stringify(error)}`)
        res.status(500).send('Error when getting dashboards')
      }
    })
  }
}
