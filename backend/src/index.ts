import express from "express";
import cors from "cors";
import { config } from "./config";
import { importRouter } from "./routes/import";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", model: config.groq.model });
});

app.use("/api", importRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`GrowEasy CSV importer backend listening on :${config.port}`);
});
