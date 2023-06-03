import { $ } from "https://deno.land/x/dax@0.31.1/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { main as clientMain } from "./client.ts";
import { ensureDirSync } from "https://deno.land/std@0.190.0/fs/ensure_dir.ts";

// clean up and clone repo
await $`rm -rf matrix-bot-1`.noThrow();
await $`git clone --depth 1 https://github.com/sigmaSd/matrix-bot-1`;

// download latest neovim
const nvimPath = "download/nvim-linux64/bin/nvim";
if (!$.fs.existsSync(nvimPath)) {
  ensureDirSync("download");
  await $
    .request(
      "https://github.com/neovim/neovim/releases/download/v0.9.1/nvim-linux64.tar.gz",
    ).showProgress()
    .pipeToPath("download");
  await $`tar -xzf download/nvim-linux64.tar.gz`.cwd("download");
}

// build nvim jail
await $`cargo b --release --offline --target-dir target`
  .cwd(
    "./matrix-bot-1/nvim/jail",
  );
const jailLibPath = Deno.cwd() +
  "/matrix-bot-1/nvim/jail/target/release/libjail.so";

// keep replit instance alive (using uptimerobot to keep fetchig this server)
serve(() => new Response("", { status: 200 }), { port: 8080 });

// start matrix client
await clientMain({ nvimPath, jailLibPath });
