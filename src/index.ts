import { Context, Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { MongoClient, ObjectId } from "npm:mongodb";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const BUCKET_NAME = Deno.env.get("BUCKET_NAME")!;
const BUCKET_REGION = Deno.env.get("BUCKET_REGION")!;
const AWS_ACCESS_KEY = Deno.env.get("AWS_ACCESS_KEY")!;
const AWS_SECRET_KEY = Deno.env.get("AWS_SECRET_KEY")!;

const s3 = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
  region: BUCKET_REGION,
});

const CONNECTION_STRING = Deno.env.get("MONGO_CONNECTION")!;

// Connect to MongoDB
const client = new MongoClient(CONNECTION_STRING);
const db = client.db("karandar");

const app = new Hono();

interface IDate {
  title: string;
  description: string;
  date: Date;
  images: string[];
  imageUrls: string[];
}

app.use("*", cors());

app.options("*", (c: Context) => {
  return c.text("", 204);
});

app.get("/dates", async (c: Context) => {
  const cursor = await db.collection<IDate>("dates").find();
  const dates = await cursor.toArray();

  for (const date of dates) {
    date.imageUrls = [];
    for (const image of date?.images || []) {
      const params = {
        Bucket: BUCKET_NAME,
        Key: image,
      };
      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      date.imageUrls.push(url);
    }
  }

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
  const body = await c.req.parseBody({ all: true });

  const images = body["images"] as File[];
  const imageLocations = [];

  // only supports multiple files

  for (const image of images) {
    const buffer = await image.arrayBuffer();
    const key = `${id}/${image.name}`;
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: image.type,
    };

    const command = new PutObjectCommand(params);

    await s3.send(command);

    imageLocations.push(key);
  }

  const dates = db.collection("dates");
  body["images"] = imageLocations;
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
