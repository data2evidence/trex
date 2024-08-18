import Fastify from "npm:fastify@v5.0.0-alpha.2";
const fastify = Fastify({ logger: false });

fastify.get("/", (request, reply) => {
  reply.send("Hello world!");
});

fastify.listen({ port: 3000 });