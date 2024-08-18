export class Security {
	async initialize(schemes) {
		// schemes will contain securitySchemes as found in the openapi specification
		console.log("Initialize:", JSON.stringify(schemes));
	}

	// Security scheme: petstore_auth
	// Type: oauth2
	async petstore_auth(req, reply, params) {
		console.log("petstore_auth: Authenticating request");
		// If validation fails: throw new Error('Could not authenticate request')
		// Else, simply return.
        console.log("SEC "+params);
		if(params[0]!="admin:pets") {
			console.log("SEC rej");

        	reply.code(err.statusCode).send(err);
		}
		// The request object can also be mutated here (e.g. to set 'req.user')
	}
}