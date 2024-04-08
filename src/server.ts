import fastify from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { generateSlug } from "./utils/generate-slug";
import "dotenv/config";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

// códigos:
// 20x -> sucesso
// 30x -> redirecionamento
// 40x -> erro do cliente (erro em quem está fazendo a chamada
// para a a API)
// 50X -> Erro do servidor (independente do que está sendo enviado,
// um erro está acontecendo no servidor)

const app = fastify();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

const prisma = new PrismaClient({
  log: ["query"],
});

// Métodos HTTP: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS...

app.withTypeProvider<ZodTypeProvider>().post(
  "/events",
  {
    schema: {
      body: z.object({
        title: z.string().min(4),
        details: z.string().nullable(),
        maximumAttendees: z.number().int().positive().nullable(),
      }),
      response: {
        201: z.object({
          eventId: z.string().uuid(),
        }),
      },
    },
  },
  async (request, reply) => {
    const { title, details, maximumAttendees } = request.body;

    const slug = generateSlug(title);

    const eventWithSlug = await prisma.event.findUnique({
      where: {
        slug,
      },
    });

    if (eventWithSlug != null) {
      throw new Error("Another event with same slug already exists!");
    }

    const event = await prisma.event.create({
      data: {
        title,
        details,
        maximumAttendees,
        slug,
      },
    });

    return reply.status(201).send({ eventId: event.id });
  }
);

app.listen({ port: 3333 }).then(() => {
  console.log("Server is running on port 3333 :)");
});
