import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

function base64url(input: Uint8Array): string {
  const str = btoa(String.fromCharCode(...input));
  return str.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmacSHA256(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return base64url(new Uint8Array(sig));
}

async function signJWTHS256(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = new TextEncoder();
  const h = base64url(enc.encode(JSON.stringify(header)));
  const p = base64url(enc.encode(JSON.stringify(payload)));
  const toSign = `${h}.${p}`;
  const sig = await hmacSHA256(secret, toSign);
  return `${toSign}.${sig}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  try {
    const LIVEKIT_WS_URL = Deno.env.get("LIVEKIT_WS_URL");
    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");

    if (!LIVEKIT_WS_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return new Response(JSON.stringify({ error: "Missing LiveKit envs" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let identity = "guest-" + Math.random().toString(36).slice(2, 8);
    let roomName = "playjoob";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.identity === "string") identity = body.identity.slice(0, 64);
      if (typeof body?.room === "string") roomName = body.room.slice(0, 128);
    } else {
      const url = new URL(req.url);
      identity = url.searchParams.get("identity") ?? identity;
      roomName = url.searchParams.get("room") ?? roomName;
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: LIVEKIT_API_KEY,
      sub: identity,
      nbf: now - 5,
      exp: now + 60 * 60,
      video: {
        room: roomName,
        roomJoin: true,
        roomCreate: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    };

    const token = await signJWTHS256(payload, LIVEKIT_API_SECRET);

    return new Response(JSON.stringify({ token, wsUrl: LIVEKIT_WS_URL, identity, room: roomName }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err?.message ?? err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
