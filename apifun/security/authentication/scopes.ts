import { env } from './env.ts'
interface UrlScope {
  path: string
  scopes: string[]
  httpMethods?: string[]
}
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
export const REQUIRED_URL_SCOPES: { path: string; scopes: string[]; httpMethods?: string[] }[] = [
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
  },
  {
    path: '^/usermgmt/api/alp-data-admin',
    scopes: ['usermgmt.dataAdmin.read']
  },
  {
    path: '^/usermgmt/api/alp-data-admin/(register|withdraw)',
    scopes: ['usermgmt.dataAdmin.write']
  },
  {
    path: '^/usermgmt/api/alp-user',
    scopes: ['usermgmt.user.read']
  },
  {
    path: '^/usermgmt/api/alp-user/(register|withdraw)',
    scopes: ['usermgmt.user.write']
  },
  {
    path: '^/usermgmt/api/group(.*)',
    scopes: ['usermgmt.group.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/usermgmt/api/group/study/(.+)/role/(.+)',
    scopes: ['usermgmt.group.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/usermgmt/api/group/tenant/(.+)/role/(.+)',
    scopes: ['usermgmt.group.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/usermgmt/api/group/create',
    scopes: ['usermgmt.group.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/usermgmt/api/group/(delete|cleanup)',
    scopes: ['usermgmt.group.delete'],
    httpMethods: ['POST']
  },
  {
    path: '^/usermgmt/api/me',
    scopes: ['usermgmt.me'],
    httpMethods: ['GET', 'PUT', 'DELETE']
  },
  {
    path: '^/usermgmt/api/me/is_token_valid_internal',
    scopes: ['usermgmt.me'],
    httpMethods: ['GET']
  },
  {
    path: '^/usermgmt/api/study/access-request/list/(.+)',
    scopes: ['usermgmt.studyAccessRequest.read']
  },
  {
    path: '^/usermgmt/api/study/access-request',
    scopes: ['usermgmt.studyAccessRequest.add']
  },
  {
    path: '^/usermgmt/api/study/access-request/me',
    scopes: ['usermgmt.studyAccessRequest.me']
  },
  {
    path: '^/usermgmt/api/study/access-request/(approve|reject)',
    scopes: ['usermgmt.studyAccessRequest.update']
  },
  {
    path: '^/usermgmt/api/user-group/list',
    scopes: ['usermgmt.userGroup.tenant.read']
  },
  {
    path: '^/usermgmt/api/user-group$',
    scopes: ['usermgmt.userGroup.read']
  },
  {
    path: '^/usermgmt/api/user-group\\?',
    scopes: ['usermgmt.userGroup.read']
  },
  {
    path: '^/usermgmt/api/user-group/overview',
    scopes: ['usermgmt.userGroup.overview']
  },
  {
    path: '^/usermgmt/api/user-group/register-tenant-roles',
    scopes: ['usermgmt.userGroup.tenant.add']
  },
  {
    path: '^/usermgmt/api/user-group/register-study-roles',
    scopes: ['usermgmt.userGroup.study.add']
  },
  {
    path: '^/usermgmt/api/user-group/withdraw-tenant-roles',
    scopes: ['usermgmt.userGroup.tenant.delete']
  },
  {
    path: '^/usermgmt/api/user-group/withdraw-study-roles',
    scopes: ['usermgmt.userGroup.study.delete']
  },
  {
    path: '^/usermgmt/api/user-group/status/(.+)',
    scopes: ['usermgmt.userGroup.status']
  },
  {
    path: '^/usermgmt/api/member/tenant/add',
    scopes: ['usermgmt.member.tenant.add']
  },
  {
    path: '^/usermgmt/api/member/tenant/delete',
    scopes: ['usermgmt.member.tenant.delete']
  },
  {
    path: '^/usermgmt/api/member/tenant/activate',
    scopes: ['usermgmt.member.tenant.update']
  },
  {
    path: '^/usermgmt/api/user(.*)',
    scopes: ['usermgmt.user.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/usermgmt/api/user',
    scopes: ['usermgmt.user.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/usermgmt/api/user/(.*)',
    scopes: ['usermgmt.user.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/usermgmt/api/user/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/password',
    scopes: ['usermgmt.user.password.write'],
    httpMethods: ['PUT']
  },
  {
    path: '^/usermgmt/api/setup/(.*)',
    scopes: ['usermgmt.setup'],
    httpMethods: ['POST', 'GET']
  },
  {
    path: `^/db-credentials/db/list$`,
    scopes: ['dbCredentials.db.list'],
    httpMethods: ['GET']
  },
  {
    path: `^/db-credentials/db/${UUID}$`,
    scopes: ['dbCredentials.db.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/db-credentials/db/(postgres|hana)/vocab-schema/list$`,
    scopes: ['dbCredentials.db.vocabSchema.list'],
    httpMethods: ['GET']
  },
  {
    path: '^/db-credentials/db$',
    scopes: ['dbCredentials.db.write'],
    httpMethods: ['POST', 'PUT']
  },
  {
    path: '^/db-credentials/db/credential$',
    scopes: ['dbCredentials.db.credential.update'],
    httpMethods: ['PUT']
  },
  {
    path: `^/db-credentials/db/${UUID}$`,
    scopes: ['dbCredentials.db.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    scopes: ['portal.dataset.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/list$',
    scopes: ['portal.dataset.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/list\\?(.*)role=researcher(&.*)?$',
    scopes: ['portal.dataset.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/list\\?role=systemAdmin$',
    scopes: ['portal.dataset.systemAdmin.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset\\?(.*)',
    scopes: ['portal.dataset.exist'],
    httpMethods: ['HEAD']
  },
  {
    path: '^/system-portal/dataset$',
    scopes: ['portal.dataset.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/system-portal/dataset/snapshot$',
    scopes: ['portal.dataset.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/system-portal/dataset$',
    scopes: ['portal.dataset.update'],
    httpMethods: ['PUT']
  },
  {
    path: '^/system-portal/dataset/attribute$',
    scopes: ['portal.dataset.update'],
    httpMethods: ['PUT']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    scopes: ['portal.dataset.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/resource/list$',
    scopes: ['portal.dataset.resource.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/resource/(.*)/download$',
    scopes: ['portal.dataset.resource.download'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/resource$',
    scopes: ['portal.dataset.resource.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/resource/(.*)',
    scopes: ['portal.dataset.resource.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/system-portal/dataset/release$',
    scopes: ['portal.dataset.release.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/release/list',
    scopes: ['portal.dataset.release.list.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/release/([0-9]+)$',
    scopes: ['portal.dataset.release.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/filter-scopes$',
    scopes: ['portal.filterScope.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/pa-config/metadata/list$',
    scopes: ['portal.paConfig.list.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/pa-config/(backend|me)$',
    scopes: ['portal.dataset.paConfig.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/notebook$',
    scopes: ['portal.notebook.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/notebook$',
    scopes: ['portal.notebook.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/system-portal/notebook$',
    scopes: ['portal.notebook.update'],
    httpMethods: ['PUT']
  },
  {
    path: '^/system-portal/notebook/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    scopes: ['portal.notebook.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/system-portal/dataset/metadata-config/tag/list',
    scopes: ['portal.dataset.metadataConfig.tag.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/metadata-config/tag',
    scopes: ['portal.dataset.metadataConfig.tag.write'],
    httpMethods: ['POST']
  },
  {
    path: '^/system-portal/dataset/metadata-config/tag',
    scopes: ['portal.dataset.metadataConfig.tag.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/system-portal/dataset/metadata-config/attribute/list',
    scopes: ['portal.dataset.metadataConfig.attribute.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/dataset/metadata-config/attribute',
    scopes: ['portal.dataset.metadataConfig.attribute.write'],
    httpMethods: ['POST', 'PUT']
  },
  {
    path: '^/system-portal/dataset/metadata-config/attribute',
    scopes: ['portal.dataset.metadataConfig.attribute.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/system-portal/system/feature/list(.*)',
    scopes: ['portal.system.feature.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/tenant/list(.*)',
    scopes: ['portal.tenant.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/feature/list(.*)',
    scopes: ['portal.feature.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/system-portal/feature',
    scopes: ['portal.feature.write'],
    httpMethods: ['POST']
  },
  {
    path: `^/system-portal/dataset/dashboard/(.*)`,
    scopes: ['portal.dataset.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/system-portal/dataset/dashboards/list$`,
    scopes: ['portal.dataset.update'],
    httpMethods: ['GET']
  },
  {
    path: `^/system-portal/config(.*)`,
    scopes: ['portal.config.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/system-portal/config$`,
    scopes: ['portal.config.write'],
    httpMethods: ['PUT']
  },
  {
    path: `^/dashboard-gate/${UUID}/content(.*)`,
    scopes: ['gateway.dashboardGate.content'],
    httpMethods: ['GET']
  },
  {
    path: `^/dashboard-gate/register`,
    scopes: ['gateway.dashboardGate.register'],
    httpMethods: ['POST']
  },
  {
    path: '^/alp-nifi-api/nifi/(.*)',
    scopes: ['nifimgmt.userAdmin']
  },
  {
    path: '^/alp-nifi-api/nifi-registry/(.*)',
    scopes: ['nifimgmt.userAdmin']
  },
  {
    path: '^/terminology/concept-set$',
    scopes: ['gateway.terminology.conceptSet.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/terminology/concept-set$',
    scopes: ['gateway.terminology.conceptSet.create'],
    httpMethods: ['POST']
  },
  {
    path: `^/terminology/concept-set/${UUID}?`,
    scopes: ['gateway.terminology.conceptSet.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/terminology/concept-set/${UUID}$`,
    scopes: ['gateway.terminology.conceptSet.update'],
    httpMethods: ['PUT']
  },
  {
    path: `^/terminology/concept-set/${UUID}$`,
    scopes: ['gateway.terminology.conceptSet.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/terminology/concept/filter-options(.*)',
    scopes: ['gateway.terminology.concept.filterOptions.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/terminology/concept/hierarchy(.*)',
    scopes: ['gateway.terminology.concept.hierarchy.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/terminology/concept/recommended/list$',
    scopes: ['gateway.terminology.concept.recommended.read'],
    httpMethods: ['POST']
  },
  {
    path: '^/terminology/fhir/4_0_0/(.*)',
    scopes: ['gateway.terminology.fhir.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/terminology/hybrid-search-config',
    scopes: ['gateway.terminology.hybridSearchConfig.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/terminology/hybrid-search-config',
    scopes: ['gateway.terminology.hybridSearchConfig.update'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/dataflow/(.*)',
    scopes: ['dataflowmgmt.dataflow.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/dataflow(.*)',
    scopes: ['dataflowmgmt.dataflow.add'],
    httpMethods: ['POST']
  },
  {
    path: `^/dataflow-mgmt/dataflow/${UUID}`,
    scopes: ['dataflowmgmt.dataflow.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/dataflow-mgmt/dataflow/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    scopes: ['dataflowmgmt.dataflow.revision.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/dataflow-mgmt/analysisflow/(.*)',
    scopes: ['dataflowmgmt.analysisflow.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/analysisflow(.*)',
    scopes: ['dataflowmgmt.analysisflow.add'],
    httpMethods: ['POST']
  },
  {
    path: `^/dataflow-mgmt/analysisflow/${UUID}`,
    scopes: ['dataflowmgmt.analysisflow.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/dataflow-mgmt/analysisflow/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    scopes: ['dataflowmgmt.analysisflow.revision.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/dataflow-mgmt/db-svc/(run|dataset-attributes|fetch-version-info)$',
    scopes: ['dataflowmgmt.dbsvc.flowRun.run'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/list$',
    scopes: ['dataflowmgmt.prefect.flow.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/metadata/list$',
    scopes: ['dataflowmgmt.prefect.flow.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/datamodels/list$',
    scopes: ['dataflowmgmt.prefect.flow.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/deployment$',
    scopes: ['dataflowmgmt.prefect.flow.deployment.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow$',
    scopes: ['dataflowmgmt.prefect.flow.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/file-deployment$',
    scopes: ['dataflowmgmt.prefect.flow.fileDeployment.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/git-deployment$',
    scopes: ['dataflowmgmt.prefect.flow.fileDeployment.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/default-deployment$',
    scopes: ['dataflowmgmt.prefect.flow.fileDeployment.add'],
    httpMethods: ['POST', 'GET']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow/(.*)',
    scopes: ['dataflowmgmt.prefect.flow.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow-run/(.*)',
    scopes: ['dataflowmgmt.prefect.flowRun.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow-run/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/cancellation',
    scopes: ['dataflowmgmt.prefect.flowRun.cancel'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow-run/deployment',
    scopes: ['dataflowmgmt.prefect.flowRun.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/flow-run/(.*)',
    scopes: ['dataflowmgmt.prefect.flowRun.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/analysis-run/(.*)',
    scopes: ['dataflowmgmt.prefect.flowRun.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/dataflow-mgmt/prefect/task-run/(.*)',
    scopes: ['dataflowmgmt.prefect.taskRun.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/prefect/test-run',
    scopes: ['dataflowmgmt.prefect.testRun.add'],
    httpMethods: ['POST']
  },
  {
    path: `^/dataflow-mgmt/prefect/flow-run/${UUID}/state`,
    scopes: ['dataflowmgmt.prefect.flowRun.state'],
    httpMethods: ['GET']
  },
  {
    path: `^/dataflow-mgmt/dqd/data-quality/flow-run/${UUID}/(results|overview)$`,
    scopes: ['dataflowmgmt.dqd.dataQuality.flowRun.results.overview.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/dataflow-mgmt/dqd/data-quality/dataset/${UUID}/cohort/[0-9]+/flow-run/latest$`,
    scopes: ['dataflowmgmt.dqd.dataQuality.dataset.cohort.flowRun.latest.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/dqd/data-quality/flow-run$',
    scopes: ['dataflowmgmt.dqd.dataQuality.flowRun.add'],
    httpMethods: ['POST']
  },
  {
    path: `^/dataflow-mgmt/dqd/data-(quality|characterization)/dataset/${UUID}/flow-run/latest$`,
    scopes: ['dataflowmgmt.dqd.job.dataset.flowRun.latest.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/dataflow-mgmt/dqd/data-(quality|characterization)/dataset/${UUID}/release/([0-9]+)/flow-run$`,
    scopes: ['dataflowmgmt.dqd.job.dataset.release.flowRun.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/dataflow-mgmt/dqd/data-quality/dataset/${UUID}(/category|/domain)?/history$$`,
    scopes: ['dataflowmgmt.dqd.dataQuality.dataset.history.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/dataflow-mgmt/dqd/data-quality/dataset/${UUID}/domain/continuity$`,
    scopes: ['dataflowmgmt.dqd.dataQuality.dataset.continuity.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/dqd/data-characterization/schema-mapping/list',
    scopes: ['dataflowmgmt.dqd.dataCharacterization.schemaMapping.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/dataflow-mgmt/dqd/data-characterization/flow-run/${UUID}/results/(.*)`,
    scopes: ['dataflowmgmt.dqd.dataCharacterization.flowRun.results.drilldown.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/dataflow-mgmt/dqd/data-characterization/flow-run$',
    scopes: ['dataflowmgmt.dqd.dataCharacterization.flowRun.add'],
    httpMethods: ['POST']
  },
  {
    path: `^/dataflow-mgmt/job-history/flow-runs`,
    scopes: ['dataflowmgmt.jobHistory.filter.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/dataflow-mgmt/meilisearch/index/flow-run`,
    scopes: ['dataflowmgmt.meilisearch.flowRun.add'],
    httpMethods: ['POST']
  },
  {
    path: `^/dataflow-mgmt/db-svc/run`,
    scopes: ['dataflowmgmt.dbSvc.flowRun.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/data-model/[a-zA-Z0-9-]+/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.schema.create'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/data-model/[a-zA-Z0-9-]+/schemasnapshot/[a-zA-Z0-9_]+(.*)',
    scopes: ['dbSvc.snapshot.create'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/importdata(.*)',
    scopes: ['dbSvc.schema.importData'],
    httpMethods: ['PUT']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/data-model/[a-zA-Z0-9-]+[?](&*schema=[a-zA-Z0-9_]+)+$',
    scopes: ['dbSvc.schema.update'],
    httpMethods: ['PUT']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/maintenance/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.maintenance.update'],
    httpMethods: ['PUT']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/data-model/[a-zA-Z0-9-]+/count/[0-9]+(.*)',
    scopes: ['dbSvc.schema.delete.rollbackCount'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/data-model/[a-zA-Z0-9-]+/tag/[0-9a-zA-z]+(.*)',
    scopes: ['dbSvc.schema.delete.rollbackTag'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/version-info',
    scopes: ['dbSvc.schema.versionInfo.read'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/datamodels',
    scopes: ['dbSvc.datamodels.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/cdmversion/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.schema.cdmVersion.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/vocabSchemas',
    scopes: ['dbSvc.vocabSchemas.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/vocabSchema/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.schema.vocabSchema.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/metadata/schemasnapshot/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.schema.snapshot.metadata.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/staging-area/[a-zA-Z0-9_]+/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.stagingArea.create'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/staging-area/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.stagingArea.update'],
    httpMethods: ['PUT']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/data-model/[a-zA-Z0-9-]+/schemasnapshotparquet/[a-zA-Z0-9_]+(.*)',
    scopes: ['dbSvc.snapshot.parquet.create'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/dataCharacterization/database/[a-zA-Z0-9_]+/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.schema.create'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/dataCharacterization/database/[a-zA-Z0-9_]+/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.schema.delete'],
    httpMethods: ['DELETE']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/schema/[a-zA-Z0-9_]+',
    scopes: ['dbSvc.questionnaire.create'],
    httpMethods: ['POST']
  },
  {
    path: '^/alpdb/[a-zA-Z]+/database/[a-zA-Z0-9_]+/schema/[a-zA-Z0-9_]+/questionnaire/[a-zA-Z0-9]+',
    scopes: ['dbSvc.questionnaire.responses.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/meilisearch-svc/indexes',
    scopes: ['meilisearchSvc.index.add'],
    httpMethods: ['POST']
  },
  {
    path: '^/meilisearch-svc/indexes/[a-zA-Z0-9_-]+/settings(.*)',
    scopes: ['meilisearchSvc.index.setting.update'],
    httpMethods: ['PATCH']
  },
  {
    path: '^/meilisearch-svc/indexes/[a-zA-Z0-9_-]+/documents(.*)',
    scopes: ['meilisearchSvc.document.add'],
    httpMethods: ['POST', 'PUT']
  },
  {
    path: '^/meilisearch-svc/indexes/[a-zA-Z0-9_-]+/settings/synonyms',
    scopes: ['meilisearchSvc.document.add'],
    httpMethods: ['PUT']
  },
  {
    path: `^/gateway/api/dataset/${UUID}/cdm-schema/snapshot/metadata$`,
    scopes: ['gateway.dataset.dashboards.read'],
    httpMethods: ['GET']
  },
  {
    path: `^/gateway/api/dataset/${UUID}/cohorts$`,
    scopes: ['gateway.dataset.cohorts.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/gateway/api/dataset$',
    scopes: ['gateway.dataset.create'],
    httpMethods: ['POST']
  },
  {
    path: '^/gateway/api/dataset/snapshot$',
    scopes: ['gateway.dataset.snapshot.create'],
    httpMethods: ['POST']
  },
  {
    path: `^/gateway/api/dataset/${UUID}/dashboard/list$`,
    scopes: ['gateway.dataset.dashboards.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/gateway/api/db/[a-zA-Z0-9_]+/data-models$',
    scopes: ['gateway.db.dataModels.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/gateway/api/db/[a-zA-Z0-9_]+/vocab-schemas$',
    scopes: ['gateway.db.vocabSchemas.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/gateway/api/db/dataset/version-info$',
    scopes: ['gateway.db.dataset.versionInfo.read'],
    httpMethods: ['GET']
  },
  {
    path: '^/gateway/api/db/schema$',
    scopes: ['gateway.db.schema.update'],
    httpMethods: ['PUT']
  },
  {
    path: '^/gateway/api/fhir',
    scopes: ['gateway.fhir.create'],
    httpMethods: ['POST']
  }
]
export const ROLE_SCOPES = {
  STUDY_VIEWER_ROLE: [ 'PA.DatasetOverview.svc'],
  STUDY_RESEARCHER_ROLE: ['PA.svc', 'PAConfig.i18n', 'PAConfig.svc/read', 'CDWConfig.svc/read'],
  ALP_ADMIN_ROLE: [
    'PAConfig.ui',
    'PAConfig.i18n',
    'PAConfig.svc',
    'PSConfig.svc',
    'CDWConfig.ui',
    'CDWConfig.svc',
    'ConfigAssignment.ui',
    'ConfigAssignment.svc'
  ],
  ALP_OWNER_ROLE: [
    'PAConfig.ui',
    'PAConfig.i18n',
    'PAConfig.svc',
    'PSConfig.svc',
    'CDWConfig.ui',
    'CDWConfig.svc',
    'ConfigAssignment.ui',
    'ConfigAssignment.svc'
  ],
  MRI_SUPER_USER: [
    'PA.svc', 'PAConfig.i18n', 'PAConfig.svc/read', 'CDWConfig.svc/read',
    'PAConfig.ui',
    'PAConfig.i18n',
    'PAConfig.svc',
    'PSConfig.svc',
    'CDWConfig.ui',
    'CDWConfig.svc',
    'ConfigAssignment.ui',
    'ConfigAssignment.svc'
  ],
  ALP_USER_ADMIN: [
    'usermgmt.dataAdmin.read',
    'usermgmt.dataAdmin.write',
    'usermgmt.user.read',
    'usermgmt.user.write',
    'usermgmt.user.add',
    'usermgmt.user.delete',
    'usermgmt.user.password.write',
    'usermgmt.group.delete',
    'usermgmt.userGroup.read',
    'usermgmt.userGroup.overview',
    'usermgmt.userGroup.tenant.read',
    'usermgmt.userGroup.tenant.add',
    'usermgmt.userGroup.study.add',
    'usermgmt.userGroup.tenant.delete',
    'usermgmt.userGroup.study.delete',
    'usermgmt.member.tenant.add',
    'usermgmt.member.tenant.delete',
    'usermgmt.member.tenant.update',
    'nifimgmt.userAdmin'
  ],
  ALP_SYSTEM_ADMIN: [
    'usermgmt.dataAdmin.read',
    'usermgmt.group.read',
    'usermgmt.me',
    'usermgmt.studyAccessRequest.read',
    'usermgmt.studyAccessRequest.update',
    'usermgmt.user.read',
    'usermgmt.userGroup.read',
    'usermgmt.userGroup.overview',
    'usermgmt.userGroup.tenant.read',
    'usermgmt.user.read',
    'usermgmt.user.add',
    'usermgmt.setup',
    'dbCredentials.db.list',
    'dbCredentials.db.read',
    'dbCredentials.db.vocabSchema.list',
    'dbCredentials.db.write',
    'dbCredentials.db.credential.update',
    'dbCredentials.db.delete',
    'portal.dataset.systemAdmin.read',
    'portal.dataset.exist',
    'portal.dataset.add',
    'portal.dataset.update',
    'portal.dataset.delete',
    'portal.dataset.resource.read',
    'portal.dataset.resource.add',
    'portal.dataset.resource.delete',
    'portal.dataset.resource.download',
    'portal.dataset.release.add',
    'portal.dataset.release.list.read',
    'portal.dataset.release.read',
    'portal.paConfig.list.read',
    'portal.tenant.read',
    'portal.feature.read',
    'portal.feature.write',
    'portal.system.feature.read',
    'portal.dataset.metadataConfig.tag.read',
    'portal.dataset.metadataConfig.tag.write',
    'portal.dataset.metadataConfig.tag.delete',
    'portal.dataset.metadataConfig.attribute.read',
    'portal.dataset.metadataConfig.attribute.write',
    'portal.dataset.metadataConfig.attribute.delete',
    'portal.config.read',
    'portal.config.write',
    'terminology.user.read',
    'dataflowmgmt.dataflow.read',
    'dataflowmgmt.dataflow.add',
    'dataflowmgmt.dataflow.delete',
    'dataflowmgmt.dataflow.revision.delete',
    'dataflowmgmt.dbsvc.flowRun.run',
    'dataflowmgmt.prefect.flow.read',
    'dataflowmgmt.prefect.flow.deployment.read',
    'dataflowmgmt.prefect.flow.add',
    'dataflowmgmt.prefect.flow.fileDeployment.add',
    'dataflowmgmt.prefect.flow.delete',
    'dataflowmgmt.prefect.flowRun.read',
    'dataflowmgmt.prefect.flowRun.cancel',
    'dataflowmgmt.prefect.flowRun.add',
    'dataflowmgmt.prefect.flowRun.state',
    'dataflowmgmt.prefect.testRun.add',
    'dataflowmgmt.prefect.taskRun.read',
    'dataflowmgmt.jobHistory.filter.read',
    'dataflowmgmt.dqd.job.dataset.flowRun.latest.read',
    'dataflowmgmt.dqd.dataQuality.flowRun.results.overview.read',
    'dataflowmgmt.dqd.dataQuality.flowRun.add',
    'dataflowmgmt.dqd.dataCharacterization.flowRun.results.drilldown.read',
    'dataflowmgmt.dqd.dataCharacterization.flowRun.add',
    'dataflowmgmt.meilisearch.flowRun.add',
    'dataflowmgmt.dbSvc.flowRun.add',
    'dbSvc.schema.create',
    'dbSvc.snapshot.create',
    'dbSvc.schema.importData',
    'dbSvc.schema.update',
    'dbSvc.schema.versionInfo.read',
    'dbSvc.datamodels.read',
    'dbSvc.schema.cdmVersion.read',
    'dbSvc.vocabSchemas.read',
    'dbSvc.schema.vocabSchema.read',
    'dbSvc.schema.snapshot.metadata.read',
    'dbSvc.snapshot.parquet.create',
    'dbSvc.schema.delete',
    'meilisearchSvc.index.add',
    'meilisearchSvc.index.setting.update',
    'meilisearchSvc.document.add',
    'gateway.dashboardGate.register',
    'gateway.dataset.dashboards.read',
    'gateway.dataset.cohorts.read',
    'gateway.dataset.create',
    'gateway.dataset.snapshot.create',
    'gateway.db.dataModels.read',
    'gateway.db.vocabSchemas.read',
    'gateway.db.dataset.versionInfo.read',
    'gateway.db.schema.update',
    'gateway.terminology.hybridSearchConfig.read',
    'gateway.terminology.hybridSearchConfig.update',
    'dataflowmgmt.analysisflow.read',
    'dataflowmgmt.analysisflow.add',
    'dataflowmgmt.analysisflow.delete',
    'dataflowmgmt.analysisflow.revision.delete',
    'gateway.fhir.create'
  ],
  ALP_DASHBOARD_VIEWER: ['gateway.dashboardGate.content'],
  TENANT_VIEWER: [
    'usermgmt.group.read',
    'usermgmt.me',
    'usermgmt.studyAccessRequest.add',
    'usermgmt.studyAccessRequest.me',
    'usermgmt.userGroup.tenant.read',
    'usermgmt.userGroup.status',
    'dataflowmgmt.dqd.job.dataset.release.flowRun.read',
    'dataflowmgmt.dqd.job.dataset.flowRun.latest.read',
    'dataflowmgmt.dqd.dataCharacterization.schemaMapping.read',
    'dataflowmgmt.dqd.dataCharacterization.flowRun.results.drilldown.read',
    'dataflowmgmt.dqd.dataQuality.flowRun.results.overview.read',
    'dataflowmgmt.dqd.dataQuality.dataset.cohort.flowRun.latest.read',
    'dataflowmgmt.dqd.dataQuality.dataset.history.read',
    'dataflowmgmt.dqd.dataQuality.dataset.continuity.read',
    'portal.tenant.read',
    'portal.feature.read',
    'portal.dataset.read',
    'portal.filterScope.read',
    'portal.dataset.release.list.read',
    'portal.config.read'
  ],
  RESEARCHER: [
    'portal.dataset.paConfig.read',
    'portal.dataset.resource.read',
    'portal.dataset.resource.download',
    'portal.notebook.read',
    'portal.notebook.add',
    'portal.notebook.update',
    'portal.notebook.delete',
    'portal.config.read',
    'terminology.user.read',
    'gateway.terminology.conceptSet.read',
    'gateway.terminology.conceptSet.create',
    'gateway.terminology.conceptSet.update',
    'gateway.terminology.conceptSet.delete',
    'gateway.terminology.concept.filterOptions.read',
    'gateway.terminology.concept.recommended.read',
    'gateway.terminology.concept.hierarchy.read',
    'gateway.terminology.fhir.read',
    'gateway.terminology.hybridSearchConfig.read',
    'dataflowmgmt.analysisflow.read',
    'dataflowmgmt.analysisflow.add',
    'dataflowmgmt.analysisflow.delete',
    'dataflowmgmt.analysisflow.revision.delete'
  ],
  ALP_SHARED: ['usermgmt.group.read', 'usermgmt.group.add', 'usermgmt.group.delete'],
  USER_MGMT_GROUP_DELETE: ['usermgmt.group.delete'],
  [`${env.IDP_ALP_SVC_CLIENT_ID}`]: ['dbCredentials.db.list', 'portal.dataset.read'],
  [`${env.IDP_ALP_DATA_CLIENT_ID}`]: [
    'portal.dataset.read',
    'meilisearchSvc.index.add',
    'meilisearchSvc.index.setting.update',
    'meilisearchSvc.document.add'
  ]
}
