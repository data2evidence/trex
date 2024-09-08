import {IAppTokenPayload} from "./authz.ts"



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
