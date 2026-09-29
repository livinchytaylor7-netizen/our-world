import { readFileSync, writeFileSync } from "node:fs";

const {
  CLOUDFLARE_D1_ID,
  CLOUDFLARE_R2_BUCKET,
  CLOUDFLARE_WORKER_NAME = "our-world",
  OWNER_EMAIL,
} = process.env;

if (
  !/^[a-f0-9-]{36}$/i.test(CLOUDFLARE_D1_ID || "") ||
  !CLOUDFLARE_R2_BUCKET
) {
  throw Error("Missing Cloudflare database or storage configuration.");
}

if (!OWNER_EMAIL || !OWNER_EMAIL.trim()) {
  throw Error("OWNER_EMAIL is missing from GitHub Actions.");
}

const filename = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(readFileSync(filename, "utf8"));

config.name = CLOUDFLARE_WORKER_NAME;
config.topLevelName = CLOUDFLARE_WORKER_NAME;

config.d1_databases[0].database_name = "our-world";
config.d1_databases[0].database_id = CLOUDFLARE_D1_ID;

config.r2_buckets[0].bucket_name = CLOUDFLARE_R2_BUCKET;

config.vars = {
  ...config.vars,
  OWNER_EMAIL: OWNER_EMAIL.trim().toLowerCase(),
};

writeFileSync(filename, JSON.stringify(config, null, 2) + "\n");
