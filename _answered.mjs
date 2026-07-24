import { Venue, Ed25519Auth } from "@covia/covia-sdk";
const auth = Ed25519Auth.fromHex(process.env.PRIVKEY);
const v = new Venue({ baseUrl: "https://venue-3.covia.ai", auth });
const keys = ((await v.workspace.list("h"))?.keys) ?? [];
for (const k of keys) {
  const r = (await v.workspace.read(`h/${k}`))?.value;
  if (r?.status && r.status !== "open") {
    console.log(`===== status=${r.status} =====`);
    console.log(JSON.stringify(r, null, 2).slice(0, 1800));
    break;
  }
}
