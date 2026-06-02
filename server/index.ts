import express from "express";
import next from "next";
import { apiRouter } from "./routes/api";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

async function main() {
  await nextApp.prepare();

  const server = express();
  server.use(express.json());
  server.use("/api", apiRouter);

  server.use((req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(`TableBite ready at http://${hostname}:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
