

import {env, _env, logger} from "../env.ts"
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
				if(res.status != 200){
					logger.log(`Error creating flow`);
					logger.log(await res.json());
				} else {
					const jres = await res.json();
					const res2 = await fetch(`${env.PREFECT_API_URL}/deployments/`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						name: f.name,
						flow_id: jres.id,
						work_pool_name: env.PREFECT_POOL,
						work_queue_name: "default",
						entrypoint: f.entrypoint,
						job_variables: {
							image: dockerimg,
							image_pull_policy: "Never",
							volumes: env.PREFECT_DOCKER_VOLUMES,
							networks: [env.PREFECT_DOCKER_NETWORK]
						}})
					});
					if(res2.status != 200) {
						logger.error(`Error creating deployment`);
						logger.error(await res2.json());
					}
					else
						logger.log(`Add flow ${f.name}`);
				}
		});
	} catch (e) {
		logger.log(e);
	}
}
