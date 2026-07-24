import { Venue, Ed25519Auth } from "@covia/covia-sdk";
const auth = Ed25519Auth.fromHex(process.env.PRIVKEY);
const v = new Venue({ baseUrl: "http://localhost:8080", auth });
const conv = ((await v.workspace.slice("g/skilled-agent/sessions",0,1)).values[0].value.frames ?? []).flatMap(f=>f.conversation ?? []);
// Show raw shape of tool + system messages to find success/error discriminators.
conv.forEach((m,i) => {
  if (m.role === "tool" || m.role === "system") {
    console.log(`[${i+1}] role=${m.role} keys=[${Object.keys(m).join(",")}] source=${m.source??""} isError=${m.is_error??m.isError??""} error=${m.error??""}`);
    const c = m.content;
    const cstr = typeof c==="string"?c:JSON.stringify(c);
    console.log(`      content(${typeof c}): ${cstr?.slice(0,110)}`);
  }
});
