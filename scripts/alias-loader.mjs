// Lets plain-node scripts import project files that use the "@/..." alias.
import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let p = path.join(process.cwd(), specifier.slice(2));
    if (!path.extname(p) && fs.existsSync(p + ".js")) p += ".js";
    return next(pathToFileURL(p).href, context);
  }
  return next(specifier, context);
}
