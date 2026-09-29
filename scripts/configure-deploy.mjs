import { readFileSync, writeFileSync } from "node:fs";

const { CLOUDFLARE_D1_ID, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_WORKER_NAME = "our-world" } = process.env;
if (!/^[a-f0-9-]{36}$/i.test(CLOUDFLARE_D1_ID || "") || !CLOUDFLARE_R2_BUCKET) {
  throw Error("Set CLOUDFLARE_D1_ID and CLOUDFLARE_R2_BUCKET before deployment.");
}
const filename = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(readFileSync(filename, "utf8"));
config.name = CLOUDFLARE_WORKER_NAME;
config.topLevelName = CLOUDFLARE_WORKER_NAME;
config.d1_databases[0].database_name = "our-world";
config.d1_databases[0].database_id = CLOUDFLARE_D1_ID;
config.r2_buckets[0].bucket_name = CLOUDFLARE_R2_BUCKET;
writeFileSync(filename, JSON.stringify(config, null, 2) + "\n");
