

import {env, logger} from "../env.ts"
import {waitfor} from "./utils.ts"

export async function addFlowPlugin(value) {
	try {
		if(!env.PREFECT_API_URL) {
			logger.error("Prefect URL not defined: skipping flow plugins");
		}
		await waitfor(env.PREFECT_HEALTH_CHECK);
		const dockerimg = value.dockerimage;
		
		if(value.flows)
			value.flows.forEach(async f => {
				const res = await fetch(`${env.PREFECT_API_URL}/flows/`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						name: f.name
					})
				});
				if(res.status <200 && res.status > 202){
					logger.error(`Error creating flow ${f.name} - ${res.status} ${res.statusText}`);
					logger.error(JSON.stringify(await res.json()));

				} else {
					const jres = await res.json();
					const body = {
						name: f.name,
						flow_id: jres.id,
						work_pool_name: env.PREFECT_POOL,
						work_queue_name: "default",
						entrypoint: f.entrypoint,
						enforce_parameter_schema: false,
						job_variables: {
							image: dockerimg,
							image_pull_policy: "Never",
							volumes: env.PREFECT_DOCKER_VOLUMES,
							networks: [env.PREFECT_DOCKER_NETWORK]
						}};
					if(f.parameter_openapi_schema) body["parameter_openapi_schema"] = f.parameter_openapi_schema
					const res2 = await fetch(`${env.PREFECT_API_URL}/deployments/`, {
					method: "POST",
					headers: { 
						"Content-Type": "application/json"
					},
					body: JSON.stringify(body)
					});
					if(res2.status <200 && res2.status > 202) {
						logger.error(`Error creating deployment ${f.name} - ${res2.status} ${res2.statusText}`);
						logger.error(JSON.stringify(await res2.json()));
					}
					else
						logger.log(`>FLOW< Successfully deployed ${f.name}`);
				}
		});
	} catch (e) {
		logger.log(e);
	}
}
