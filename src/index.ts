import { Context, Hono } from "https://deno.land/x/hono@v3.11.2/mod.ts";

const app = new Hono();

app.get("/", (c: Context) => c.text("Hello Deno!"));

Deno.serve({ port: 3000 }, app.fetch);
