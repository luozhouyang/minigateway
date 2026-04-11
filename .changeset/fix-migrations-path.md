---
"@minigateway/core": patch
---

Fix drizzle migrations folder path resolution for bundled npm package. The bundled `dist/index.mjs` now correctly resolves migrations from `dist/drizzle/` (sibling directory).
