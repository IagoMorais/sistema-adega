import "dotenv/config";

process.env.NODE_ENV = process.env.NODE_ENV || "test";

const { ensureTestDatabase } = await import("./server/tests/setup-test-db");

await ensureTestDatabase();
