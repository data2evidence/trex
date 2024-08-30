import { ITokenPayload } from 'npm:passport-azure-ad'
//import { ROLES } from '../const'
import {env} from "../env.ts"
import { UserMgmtAPI} from "../api/UserMgmtAPI.ts"

export const ROLES = {
  ALP_USER_ADMIN: 'ALP_USER_ADMIN',
  ALP_SYSTEM_ADMIN: 'ALP_SYSTEM_ADMIN',
  ALP_SQLEDITOR_ADMIN: 'ALP_SQLEDITOR_ADMIN',
  ALP_NIFI_ADMIN: 'ALP_NIFI_ADMIN',
  ALP_DASHBOARD_VIEWER: 'ALP_DASHBOARD_VIEWER',
  TENANT_VIEWER: 'TENANT_VIEWER',
  STUDY_RESEARCHER: 'RESEARCHER',
  VALIDATE_TOKEN_ROLE: 'VALIDATE_TOKEN',
  ADMIN_DATA_READER_ROLE: 'ADMIN_DATA_READER',
  BI_DATA_READER_ROLE: 'BI_DATA_READER',
  ALP_ADMIN: 'ALP_ADMIN',
  ALP_OWNER: 'ALP_OWNER'
}

const subProp = env.GATEWAY_IDP_SUBJECT_PROP

export type IAppTokenPayload = ITokenPayload & {
  given_name: string
  family_name: string
  extension_termsOfUseConsentVersion: string
  email: string
  userMgmtGroups: IUserMgmtGroups
}

interface IUserMgmtGroups {
  groups: string[]

  alp_tenant_id: string[]

  // list of tenantid
  alp_role_tenant_viewer: string[]

  // list of studyid
  alp_role_study_researcher: string[]

  alp_role_system_admin: boolean
}

interface IRoleTypeOf<T> {
  TENANT_VIEWER_ROLE?: T
  STUDY_RESEARCHER_ROLE: T
}

//Roles for tenant users map
type AlpTenantUserRoleMapType = IRoleTypeOf<string[]>

interface IUser {
  userId?: string
  name?: string
  email?: string
  mriRoles: string[]
  mriScopes: string[]
  alpRoleMap: AlpTenantUserRoleMapType
  roles?: string[]
  tenantId: string[]
  groups: string[]
  adGroups?: string[]
}
/*
const STUDY_RESEARCHER_ROLE: string[] = ['PA.svc', 'PAConfig.i18n', 'PAConfig.svc/read', 'CDWConfig.svc/read']

const ALP_ADMIN_ROLE: string[] = [
  'PAConfig.ui',
  'PAConfig.i18n',
  'PAConfig.svc',
  'PSConfig.svc',
  'CDWConfig.ui',
  'CDWConfig.svc',
  'ConfigAssignment.ui',
  'ConfigAssignment.svc'
]

const STUDY_VIEWER_ROLE = 'PA.DatasetOverview.svc'

const MRI_ROLE_ASSIGNMENTS = {
  STUDY_RESEARCHER_ROLE,
  ALP_ADMIN_ROLE,
  STUDY_VIEWER_ROLE,
  ALP_OWNER_ROLE: ALP_ADMIN_ROLE,
  MRI_SUPER_USER: [...STUDY_RESEARCHER_ROLE, ...ALP_ADMIN_ROLE]
}*/

export const SAMPLE_USER_JWT: IAppTokenPayload = {
  iss: 'https://dummy.com/aaaaaaaa-aaaa-aaaa-aaaa/v2.0/',
  exp: 1603893181,
  nbf: 1603889581,
  aud: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  sub: 'bbdaab1b-c43b-4f69-9542-5959a7c40e69',
  email: 'alice@wonderland',
  name: 'alice',
  given_name: 'alice',
  family_name: 'wonderland',
  extension_termsOfUseConsentVersion: 'V4',
  userMgmtGroups: {
    groups: [
      'Grafana admin Users',
      'Grafana editor users',
      'MRI_SUPER_USER',
      'ROLE=ALP_ADMIN',
      'TID=2f77e1eb-f42d-4404-9ca9-860e6e6d121e;ROLE=TENANT_ADMIN',
      'TID=2f77e1eb-f42d-4404-9ca9-860e6e6d121e;SID=9f0c44f1-8de9-4d4c-80c0-dcdbd134799b;ROLE=RESEARCHER'
    ],
    alp_tenant_id: ['2f77e1eb-f42d-4404-9ca9-860e6e6d121e'],
    alp_role_study_researcher: ['9f0c44f1-8de9-4d4c-80c0-dcdbd134799b'],
    alp_role_tenant_viewer: [],
    alp_role_system_admin: false
  },
  tid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  scp: 'pyqe.client',
  azp: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ver: '1.0',
  iat: 1603889581
}

export const PUBLIC_USER_JWT: IAppTokenPayload = {
  iss: 'https://dummy.com/02a644b8-0e9c-4183-8cfb-5326425c4460/v2.0/',
  exp: 1603893181,
  nbf: 1603889581,
  aud: '9f8915ae-9091-4654-a5b7-81b45ecf31ae',
  sub: '538a829a-fa0b-475b-83ac-1bce86fc4f8e',
  email: 'public@user',
  name: 'public_user',
  given_name: 'public',
  family_name: 'user',
  extension_termsOfUseConsentVersion: 'V4',
  userMgmtGroups: {
    groups: [],
    alp_tenant_id: ['2f77e1eb-f42d-4404-9ca9-860e6e6d121e'],
    alp_role_study_researcher: [],
    alp_role_tenant_viewer: [],
    alp_role_system_admin: false
  },
  tid: 'ef003beb-7f58-44b8-9744-6d8250a015d5',
  scp: '',
  azp: '9f8915ae-9091-4654-a5b7-81b45ecf31ae',
  ver: '1.0',
  iat: 1603889581
}

export function isClientCredToken(token) {
  return token.authType && token.authType === 'azure-ad'
}

const buildUserFromToken = (token: IAppTokenPayload, ROLE_SCOPES): IUser => {
  const { client_id, grant_type, name, sub, email, userMgmtGroups, groups: adGroups } = token
  const { alp_tenant_id, alp_role_study_researcher, alp_role_system_admin, groups } = userMgmtGroups
  //const sub = token[subProp]

  if (typeof alp_tenant_id === 'undefined' || alp_tenant_id.length === 0) {
    console.error(`SECURITY INCIDENT: User does not belong to a tenant ${JSON.stringify(token)}`)
    throw new Error('User does not belong to a tenant')
  }

  const roles: string[] = []
  //const mriRoles: string[] = []

  if (grant_type === 'client_credentials' || sub === client_id) {
    roles.push(sub)
  } else {
    const ctxUserGroups = userMgmtGroups
    if (ctxUserGroups.alp_role_user_admin === true) {
      roles.push(ROLES.ALP_USER_ADMIN)
    }
    if (ctxUserGroups.alp_role_system_admin === true) {
      roles.push(ROLES.ALP_SYSTEM_ADMIN)
    }
    if (ctxUserGroups.alp_role_alp_sqleditor_admin === true) {
      roles.push(ROLES.ALP_SQLEDITOR_ADMIN)
    }
    if (ctxUserGroups.alp_role_nifi_admin === true) {
      roles.push(ROLES.ALP_NIFI_ADMIN)
    }
    if (ctxUserGroups.alp_role_dashboard_viewer === true) {
      roles.push(ROLES.ALP_DASHBOARD_VIEWER)
    }
    if (ctxUserGroups.alp_role_tenant_viewer?.length > 0) {
      roles.push(ROLES.TENANT_VIEWER)
    }
    if (ctxUserGroups.alp_role_study_researcher?.length > 0) {
      for (const datasetId of ctxUserGroups.alp_role_study_researcher) {
        //if (url.includes(datasetId) || url.includes('/system-portal/notebook') || url.includes('/terminology')) {
        //  mriScopes.push(ROLES.STUDY_RESEARCHER)
        //  break
        //}
      }
    }
  }
  if (alp_role_study_researcher && alp_role_study_researcher.length > 0) {
    roles.push(ROLES.STUDY_RESEARCHER)
    //mriRoles.push(ROLES.STUDY_RESEARCHER)
    //mriScopes.push(...MRI_ROLE_ASSIGNMENTS.STUDY_RESEARCHER_ROLE)
  }

  if (alp_role_system_admin) {
    roles.push(ROLES.ALP_SYSTEM_ADMIN)
    //mriRoles.push(ROLES.ALP_SYSTEM_ADMIN)
    //mriScopes.push(...MRI_ROLE_ASSIGNMENTS.ALP_ADMIN_ROLE)
  }

  const mriRoles: string[] = Array.from(roles);
  /*mriScopes = (typeof groups === 'string' ? [] : groups).reduce((accumulator, group) => {
    if (MRI_ROLE_ASSIGNMENTS[group]) {
      mriRoles.push(group)
      accumulator = accumulator.concat(MRI_ROLE_ASSIGNMENTS[group])
    }

    return accumulator
  }, mriScopes)*/
  const roleScopesMap: Map<string, string[]> = new Map(Object.entries(ROLE_SCOPES))
  const userScopes: string[] = []
  roles.forEach(ctxRole => {
    const roleScopes = roleScopesMap.get(ctxRole)
    if (roleScopes) {
      userScopes.push(...roleScopes)
    }
  })
  let mriScopes: string[] = Array.from(new Set(userScopes));

  const user: IUser = {
    userId: sub,
    name,
    email,
    tenantId: alp_tenant_id,
    mriRoles,
    mriScopes,
    alpRoleMap: {
      STUDY_RESEARCHER_ROLE: alp_role_study_researcher
    },
    roles,
    groups: typeof groups === 'string' ? [groups] : groups,
    adGroups: typeof adGroups === 'string' ? [adGroups] : adGroups
  }

  return user
}

const buildADUserFromToken = (token: IAppTokenPayload): IUser => {
  const { tid, sub, roles } = token
  const mriScopes: string[] = []
  mriScopes.push(...roles!)
  const user: IUser = {
    userId: sub,
    tenantId: [tid!],
    mriRoles: [],
    mriScopes,
    alpRoleMap: {
      TENANT_VIEWER_ROLE: [],
      STUDY_RESEARCHER_ROLE: []
    },
    roles,
    groups: [],
    adGroups: []
  }

  return user
}

export class MriUser {
  private b2cUser: IUser
  private adUser: IUser
  private isAlice = false
  private isClientCredReqUser = false

  constructor(private token: IAppTokenPayload | string, ROLE_SCOPES, private userLang: string = 'en') {
    if (typeof token === 'string') {
      this.isAlice = true
      return
    }
    if (isClientCredToken(token)) {
      this.isClientCredReqUser = true
      this.adUser = buildADUserFromToken(token)
      return
    }

    const { sub, userMgmtGroups } = token

    if (!sub) {
      throw new Error('token has no sub')
    } else if (!userMgmtGroups) {
      throw new Error('token has no userMgmtGroups')
    }

    this.b2cUser = buildUserFromToken(token, ROLE_SCOPES)

    this.userLang = userLang.split('-')[0]
  }

  get b2cUserObject(): IUser {
    if (!this.b2cUser) {
      throw new Error('User is not configured')
    }
    return this.b2cUser
  }

  get adUserObject(): IUser {
    if (!this.adUser) {
      throw new Error('User is not configured')
    }
    return this.adUser
  }

  get isClientCredUser(): boolean {
    if (this.isClientCredReqUser) {
      return true
    }
    return false
  }
}
