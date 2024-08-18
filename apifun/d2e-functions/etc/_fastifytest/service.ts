export class Service {

	async get(req, reply) {
		console.log("get", req.url);
		return { key: "valsue" };
	}
}