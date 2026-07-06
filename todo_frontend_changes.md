# Frontend roadmap — moved to GitHub issues

This file was a one-shot capabilities gap analysis (2026-06-23) that drifted out of
sync with the code. Its items now live as GitHub issues so status is tracked there,
not here. **Source of truth: the roadmap tracking epic → [#172](https://github.com/covia-ai/frontend/issues/172).**

## P-number → issue mapping

| P | Item | Status |
|---|------|--------|
| P1 | SSE streaming in ExecutionViewer | ✅ done (#134) |
| P2 | Operations catalog page | ✅ done (#137) |
| P3 | MCP tools page | ✅ done (#135) |
| P4 | Fork / Clone agent | 🎨 design question [#171](https://github.com/covia-ai/frontend/issues/171) |
| P5 | Identity & Auth page | read-only → [#165](https://github.com/covia-ai/frontend/issues/165); UCAN/key-regen → 🎨 [#169](https://github.com/covia-ai/frontend/issues/169) |
| P6 | Scheduler UI | 📋 [#162](https://github.com/covia-ai/frontend/issues/162) |
| P7 | GoalTree + Context view | 7a → 🎨 [#170](https://github.com/covia-ai/frontend/issues/170); 7b → 📋 [#164](https://github.com/covia-ai/frontend/issues/164) |
| P8 | A2A card on venue page | ✅ done (#153) |
| P9 | DLFS file browser | 🎨 design question [#168](https://github.com/covia-ai/frontend/issues/168) |
| P10 | Schema / JSON / test-ops playground | 📋 [#159](https://github.com/covia-ai/frontend/issues/159) |
| P11 | Broken/incomplete pages | ✅ all healed (SecretList #136; myvenues/public/private artifacts fixed) |
| P12 | Navigation restructure | 🎨 design question [#167](https://github.com/covia-ai/frontend/issues/167) |
| P13 | Minor polish | core done (#149); remainder → 📋 [#166](https://github.com/covia-ai/frontend/issues/166) |
| P14 | User Memory UI | 📋 [#163](https://github.com/covia-ai/frontend/issues/163) |
| P15 | Agent chat UI | ✅ done (in AgentExplorer) |
| P16 | Agent caps editor | 📋 [#160](https://github.com/covia-ai/frontend/issues/160) |
| P17 | Agent update in-place | 📋 [#161](https://github.com/covia-ai/frontend/issues/161) |
| P18 | SDK migration & job-free reads | forward-compat done; pin-bump tail tracked with the SDK release |

Legend: ✅ done · 📋 buildable issue · 🎨 design question (decide before building).

Related hygiene/structural issues: [#157](https://github.com/covia-ai/frontend/issues/157) (strict mode + lint), [#158](https://github.com/covia-ai/frontend/issues/158) (component consolidation).
