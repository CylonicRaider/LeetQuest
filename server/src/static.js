import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const middleware = {
    static: express.static(join(__dirname, "../../dist/client")),
};

export default function buildApp() {
    const app = express();
    app.use(middleware.static);
    return app;
}
