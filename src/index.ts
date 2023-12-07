import { Context, Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { MongoClient } from "npm:mongodb";

const connectionString = Deno.env.get("MONGO_CONNECTION")!;

console.log("connectionString", connectionString);

// Connect to MongoDB
const client = new MongoClient(connectionString);
const db = client.db("karandar");

await client.db("admin").command({ ping: 1 });
console.log("Pinged your deployment. You successfully connected to MongoDB!");

const app = new Hono();

interface IDate {
  title: string;
  description: string;
  date: Date;
}

app.use("*", cors());

app.get("/", async (c: Context) => {
  const movies = db.collection("movies");

  const query = { title: "Back to the Future" };
  const movie = await movies.findOne(query);
  return c.json(movie);
});

app.options("*", (c: Context) => {
  return c.text("", 204);
});

app.get("/dates", async (c: Context) => {
  const cursor = await db.collection<IDate>("dates").find();
  const dates = await cursor.toArray();
  return c.json(dates as any);
});

app.post("/date", async (c: Context) => {
  const body = await c.req.json();
  console.log("body", body);
  const dates = db.collection("dates");

  const date = await dates.insertOne(body);
  return c.json({ date });
});

Deno.serve({ port: 3000 }, app.fetch);
