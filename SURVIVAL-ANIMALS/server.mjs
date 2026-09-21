import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.SURVIVAL_PORT || 4177);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".gltf": "model/gltf+json",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
const server = http.createServer((req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    const url = new URL(req.url, "http://localhost");
    const rel = decodeURIComponent(url.pathname);
    const file = path.resolve(root, "." + (rel === "/" ? "/index.html" : rel));
    if (
      !file.startsWith(root + path.sep) ||
      rel.split("/").some((p) => p.startsWith("."))
    ) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Content-Length": stat.size,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      if (req.method === "HEAD") res.end();
      else
        fs.createReadStream(file)
          .on("error", () => res.destroy())
          .pipe(res);
    });
  } catch {
    res.writeHead(400).end("Bad request");
  }
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is in use. Open http://127.0.0.1:${port} or set SURVIVAL_PORT.`,
    );
    if (process.argv.includes("--open"))
      spawn(
        process.platform === "darwin" ? "open" : "xdg-open",
        [`http://127.0.0.1:${port}`],
        { stdio: "ignore" },
      );
  } else console.error(err);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log(`SURVIVAL ANIMALS → http://127.0.0.1:${port}\nStop with Ctrl+C.`);
  if (process.argv.includes("--open"))
    spawn(
      process.platform === "darwin" ? "open" : "xdg-open",
      [`http://127.0.0.1:${port}`],
      { stdio: "ignore" },
    );
});
