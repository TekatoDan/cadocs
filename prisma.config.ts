import "dotenv/config";
import { defineConfig } from "prisma/config";

const config: Parameters<typeof defineConfig>[0] = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
};

if (process.env["SHADOW_DATABASE_URL"]) {
  config.datasource!.shadowDatabaseUrl = process.env["SHADOW_DATABASE_URL"];
}

export default defineConfig(config);
