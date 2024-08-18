import openapiGlue from "npm:fastify-openapi-glue";
import { Security } from "./security.ts";
import { Service } from "./service.ts";
import Fastify from 'npm:fastify'

const fastify = Fastify({
  logger: false
})


const pluginOptions = {
	specification: new URL("./openapi.yaml", import.meta.url).pathname,
	serviceHandlers: new Service(),
	securityHandlers: new Security(),
	ajv: {
		customOptions: {
			strict: true,
		},
	},
};

async function start() {
	try {
		fastify.register(openapiGlue, pluginOptions);
		await fastify.listen({ port: 3000 })
	} catch (err) {
		fastify.log.error(err)
		//process.exit(1)
	}
}

start()