import { Context, Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { MongoClient, ObjectId } from "npm:mongodb";

const connectionString = Deno.env.get("MONGO_CONNECTION")!;

// Connect to MongoDB
const client = new MongoClient(connectionString);
const db = client.db("karandar");

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
  const dates = db.collection("dates");

  const date = await dates.insertOne(body);
  return c.json({ date });
});

app.put("/date/:id", async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const dates = db.collection("dates");

  const date = await dates.replaceOne({ _id: new ObjectId(id) }, body);
  return c.json({ date });
});

app.delete("/date/:id", async (c: Context) => {
  const id = c.req.param("id");
  const dates = db.collection("dates");

  const date = await dates.deleteOne({ _id: new ObjectId(id) });
  return c.json({ date });
});

Deno.serve({ port: 3000 }, app.fetch);
