import { randomBytes, scrypt } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error("NEON_DATABASE_URL is required for printer account migration.");
}

const accounts = [
  {
    username: "colbatinchlik",
    branchName: "Tinchlik",
    passwordEnv: "PRINTER_TINCHLIK_PASSWORD",
  },
  {
    username: "colbachilonzor",
    branchName: "Chilonzor",
    passwordEnv: "PRINTER_CHILONZOR_PASSWORD",
  },
  {
    username: "colbayunusobod",
    branchName: "Yunusobod",
    passwordEnv: "PRINTER_YUNUSOBOD_PASSWORD",
  },
];

const missingSecrets = accounts
  .filter((account) => !process.env[account.passwordEnv])
  .map((account) => account.passwordEnv);

if (missingSecrets.length > 0) {
  throw new Error(
    `Missing printer password secrets: ${missingSecrets.join(", ")}`,
  );
}

function hashPassword(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(
          `scrypt$32768$8$1$${salt.toString("hex")}$${derivedKey.toString("hex")}`,
        );
      },
    );
  });
}

const pool = new Pool({ connectionString });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  for (const account of accounts) {
    const existing = await client.query(
      "SELECT username FROM printer_accounts WHERE username = $1",
      [account.username],
    );

    if (existing.rowCount > 0) {
      console.log(`Kept existing database account: ${account.username}`);
      continue;
    }

    let branch = await client.query(
      "SELECT id FROM branches WHERE name = $1 LIMIT 1",
      [account.branchName],
    );

    if (branch.rowCount === 0) {
      branch = await client.query(
        "INSERT INTO branches (name) VALUES ($1) RETURNING id",
        [account.branchName],
      );
    }

    const passwordHash = await hashPassword(
      process.env[account.passwordEnv],
    );
    await client.query(
      `INSERT INTO printer_accounts
        (username, password_hash, full_name, branch_id, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [
        account.username,
        passwordHash,
        "Bosmaxona xodimi",
        branch.rows[0].id,
      ],
    );

    console.log(`Migrated printer account: ${account.username}`);
  }

  await client.query("COMMIT");
  console.log("Printer account migration completed; passwords are stored as hashes.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}