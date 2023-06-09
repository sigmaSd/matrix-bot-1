import { $ } from "https://deno.land/x/dax@0.32.0/mod.ts";
import { serve } from "https://deno.land/std@0.191.0/http/server.ts";
import { main as clientMain } from "./client.ts";
import { parse } from "https://deno.land/std@0.191.0/flags/mod.ts";

if (import.meta.main) {
  // clean up and clone repo
  await $`rm -rf matrix-bot-1`.noThrow();
  await $`git clone --depth 1 https://github.com/sigmaSd/matrix-bot-1`;

  //FIXME: using nvim from github releases + jail fails in replit with GLIBC not found error
  const nvimPath = "nvim"; // just use nvim from nixpkgs for now
  // download latest neovim
  // const nvimPath = "download/nvim-linux64/bin/nvim";
  // if (!$.fs.existsSync(nvimPath)) {
  //   ensureDirSync("download");
  //   await $
  //     .request(
  //       "https://github.com/neovim/neovim/releases/download/v0.9.1/nvim-linux64.tar.gz",
  //     ).showProgress()
  //     .pipeToPath("download");
  //   await $`tar -xzf nvim-linux64.tar.gz`.cwd("download");
  // }

  // build nvim jail
  await $`cargo b --release --offline --target-dir target`
    .cwd(
      "./matrix-bot-1/nvim/jail",
    );

  // keep replit instance alive (using uptimerobot to keep fetchig this server)
  serve(() => new Response("", { status: 200 }), { port: 8080 });

  const args = parse(Deno.args);
  const denoPath = args["deno"] ?? "deno";
  const commandTrigger = args["trigger"] ?? "!";
  const jailLibPath = args["nvim-jail"]
    ? Deno.cwd() +
      "/matrix-bot-1/nvim/jail/target/release/libjail.so"
    : undefined;
  // start matrix client
  await clientMain({ nvimPath, jailLibPath, denoPath, commandTrigger });
}
