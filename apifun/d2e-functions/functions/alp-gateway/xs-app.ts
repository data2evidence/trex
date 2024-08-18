export let routes = { 
  "routes":
  [
    {
      "source":"^/portalsvc",
      "destination":"portal-svc"
    },
    {
      "source":"^/system-portal",
      "destination":"system-portal"
    },
    {
      "source":"^/dataflow-mgmt",
      "destination":"dataflow-mgmt"
    },
    {
      "source":"^/usermgmt",
      "destination":"usermgmt"
    },
    {
      "source":"^/db-credentials",
      "destination":"db-credentials-mgr"
    },
    {
      "source": "^/alp-nifi-api",
      "destination": "nifimgmt"
    },
    {
      "source":"^/analytics-svc/api/services/bookmark(.*)$",
      "destination":"bookmark-svc"
    },
    {  
      "source":"^/analytics-svc/api/services/public/(.*)$",
      "destination":"public-analytics-svc"
    },
    {  
      "source":"^/analytics-svc/api/services/(.*)$",
      "destination":"analytics-svc"
    },
    {  
      "source":"^/analytics-svc/pa/services/(.*)$",
      "destination":"analytics-svc"
    },
    {
      "source":"^/analytics-svc/pa/config(.*)",
      "destination":"app-router"
    },
    {
      "source":"^/terminology",
      "destination":"alp-terminology-svc"
    },
    {
      "source":"^/alp-sqleditor",
      "destination":"sqleditor"
    },
    {
      "source":"^/alp-ai",
      "destination":"alp-ai-svc"
    },
    {
      "source":"^/meilisearch-svc",
      "destination":"meilisearch-svc"
    },
    {
      "source": "^/pa-config-svc/(.*)$",
      "destination":"pa-config"
    },
    {
      "source": "^/hc/hph/cdw/(.*)$",
      "destination": "cdw"
    },
    {
      "source": "^/hc/hph/config/services/(.*)$",
      "destination": "cdw"
    },
    {
      "source": "^/ps-config-svc/(.*)$",
      "destination": "ps-config"
    }
  ]
}
