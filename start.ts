import { $, parse, serve } from "./src/deps.ts";
import { main as clientMain } from "./src/client.ts";

$.setPrintCommand(true);
if (import.meta.main) {
  // clean up and clone repo
  await $`rm -rf matrix-bot-1`.noThrow();
  await $`git clone --depth 1 https://github.com/sigmaSd/matrix-bot-1`;

  //FIXME: using nvim from github releases + jail fails in replit with GLIBC not found error
  // const nvimPath = "nvim"; // just use nvim from nixpkgs for now
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

  // // build nvim jail
  // await $`cargo b --release --offline --target-dir target`
  //   .cwd(
  //     "./matrix-bot-1/src/nvim/jail",
  //   );

  // keep replit instance alive (using uptimerobot to keep fetchig this server)
  serve(() => new Response("", { status: 200 }), { port: 8080 });

  const args = parse(Deno.args);
  const denoPath = args["deno-path"] ?? "deno";
  const nimPath = args["nim-path"] ?? "nim";
  const nvimPath = args["nvim-path"] ?? "nvim";
  const commandTrigger = args["trigger"] ?? "!";
  const nvimSourceFile = Deno.cwd() + "/matrix-bot-1/src/nvim/screendump.lua";
  const safe = (!args.safe || args.safe === "true") ? true : false;

  // start matrix client
  await clientMain({
    commandTrigger,
    nvim: {
      nvimPath,
      nvimSourceFile,
    },
    deno: {
      denoPath,
    },
    nim: {
      nimPath,
    },
    safe,
    hostUrl: args["host-url"] ?? "",
  });
}
