import {
  config,
  digest,
  email,
  equal,
  issueSession,
  passwordHash,
  passwordValid,
  randomToken,
  rateLimit,
  requireOrigin,
  sendReset,
  currentUser,
} from "@/lib/auth";

import { jsonError } from "@/lib/server";

export const runtime = "edge";

export async function GET() {
  const user = await currentUser();

  return Response.json(
    { user },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!(await requireOrigin(request))) {
    return jsonError("Invalid request origin.", 403);
  }

  let data: Record<string, unknown>;

  try {
    data = await request.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const action = String(data.action ?? "");
  const address = email(data.email);

  let stage = "START";

  try {
    if (action === "register") {
      if (!address || !passwordValid(data.password)) {
        return jsonError(
          "Enter an email and a password of at least 12 characters.",
          400
        );
      }

      stage = "RATE_LIMIT";
      if (!(await rateLimit("register:" + address, 5))) {
        return jsonError(
          "Too many attempts. Try again later.",
          429
        );
      }

      stage = "CHECK_OWNER_EMAIL";
      const owner =
        address === config.OWNER_EMAIL?.trim().toLowerCase();

      let inviteHash = "";

      if (owner) {
        stage = "OWNER_LOOKUP";
        const existing = await config.DB
          .prepare("SELECT id FROM accounts WHERE role='owner'")
          .first();

        if (existing) {
          return jsonError(
            "Owner account already exists.",
            409
          );
        }

        if (
          !config.SETUP_KEY ||
          !equal(String(data.setupKey ?? ""), config.SETUP_KEY)
        ) {
          return jsonError(
            "Setup code is incorrect.",
            403
          );
        }
      } else {
        inviteHash = await digest(
          String(data.inviteToken ?? "")
        );

        const invite = await config.DB
          .prepare(
            "SELECT email FROM invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?"
          )
          .bind(inviteHash, Date.now())
          .first<{ email: string }>();

        if (!invite || invite.email !== address) {
          return jsonError(
            "Invitation expired or does not match this email.",
            403
          );
        }
      }

      const existing = await config.DB
        .prepare(
          "SELECT id,role FROM accounts WHERE email=?"
        )
        .bind(address)
        .first<{ id: string; role: string }>();

      if (existing && existing.role !== "partner") {
        return jsonError(
          "Account already exists.",
          409
        );
      }

      const id = existing?.id ?? crypto.randomUUID();
      const salt = randomToken();

      stage = "PASSWORD_HASH";
      const hash = await passwordHash(
        String(data.password),
        salt
      );

      if (existing) {
        await config.DB
          .prepare(
            "UPDATE accounts SET password_hash=?,salt=?,enabled=1 WHERE id=?"
          )
          .bind(hash, salt, id)
          .run();
      } else {
        await config.DB
          .prepare(
            "INSERT INTO accounts(id,email,role,password_hash,salt,enabled) VALUES(?,?,?,?,?,1)"
          )
          .bind(
            id,
            address,
            owner ? "owner" : "partner",
            hash,
            salt
          )
          .run();
      }

      if (!owner) {
        await config.DB
          .prepare(
            "UPDATE invites SET used_at=? WHERE token_hash=? AND used_at IS NULL"
          )
          .bind(Date.now(), inviteHash)
          .run();

        await config.DB
          .prepare(
            "UPDATE household SET partner_email=? WHERE id='family'"
          )
          .bind(address)
          .run();
      }

      stage = "CREATE_SESSION";
      const sessionCookie = await issueSession(id);

      return Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie": sessionCookie,
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (action === "login") {
      if (!address || !passwordValid(data.password)) {
        return jsonError(
          "Incorrect email or password.",
          401
        );
      }

      if (!(await rateLimit("login:" + address, 12))) {
        return jsonError(
          "Too many attempts. Try again later.",
          429
        );
      }

      const account = await config.DB
        .prepare(
          "SELECT id,password_hash AS hash,salt FROM accounts WHERE email=? AND enabled=1"
        )
        .bind(address)
        .first<{
          id: string;
          hash: string;
          salt: string;
        }>();

      const computed = await passwordHash(
        String(data.password),
        account?.salt ?? "not-a-real-salt"
      );

      if (!account || !equal(computed, account.hash)) {
        return jsonError(
          "Incorrect email or password.",
          401
        );
      }

      const sessionCookie = await issueSession(account.id);

      return Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie": sessionCookie,
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (action === "logout") {
      const user = await currentUser();

      if (user) {
        const token = request.headers
          .get("cookie")
          ?.match(/(?:^|;\s*)ow_session=([^;]+)/)?.[1];

        if (token) {
          await config.DB
            .prepare(
              "DELETE FROM sessions WHERE token_hash=?"
            )
            .bind(await digest(token))
            .run();
        }
      }

      return Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie":
              "ow_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
          },
        }
      );
    }

    if (action === "reset-request") {
      if (!address) {
        return jsonError("Enter your email.", 400);
      }

      if (!(await rateLimit("reset:" + address, 4))) {
        return jsonError(
          "Too many attempts. Try again later.",
          429
        );
      }

      const account = await config.DB
        .prepare(
          "SELECT id FROM accounts WHERE email=? AND enabled=1"
        )
        .bind(address)
        .first<{ id: string }>();

      if (account) {
        const token = randomToken();

        await config.DB
          .prepare(
            "INSERT INTO password_resets(token_hash,account_id,expires_at) VALUES(?,?,?)"
          )
          .bind(
            await digest(token),
            account.id,
            Date.now() + 1800000
          )
          .run();

        await sendReset(
          address,
          String(config.APP_ORIGIN) + "/?reset=" + token
        );
      }

      return Response.json({
        ok: true,
        message:
          "If this account exists, a reset link has been sent.",
      });
    }

    if (action === "reset") {
      if (!passwordValid(data.password)) {
        return jsonError(
          "Use a password of at least 12 characters.",
          400
        );
      }

      const hash = await digest(String(data.token ?? ""));

      const row = await config.DB
        .prepare(
          "SELECT account_id AS id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?"
        )
        .bind(hash, Date.now())
        .first<{ id: string }>();

      if (!row) {
        return jsonError(
          "This reset link has expired.",
          403
        );
      }

      const salt = randomToken();

      await config.DB.batch([
        config.DB
          .prepare(
            "UPDATE accounts SET salt=?,password_hash=? WHERE id=?"
          )
          .bind(
            salt,
            await passwordHash(String(data.password), salt),
            row.id
          ),

        config.DB
          .prepare(
            "DELETE FROM sessions WHERE account_id=?"
          )
          .bind(row.id),

        config.DB
          .prepare(
            "UPDATE password_resets SET used_at=? WHERE token_hash=?"
          )
          .bind(Date.now(), hash),
      ]);

      return Response.json({ ok: true });
    }

    return jsonError("Unknown action.", 400);
  } catch (error) {
    console.error("OUR_WORLD_AUTH_ERROR", stage, error);

    return jsonError(
      "Account service unavailable. Diagnostic: " + stage,
      503
    );
  }
}