import { $ } from "https://deno.land/x/dax@0.31.1/mod.ts";
import { main as clientMain } from "./client.ts";

// #
// date
// # cleanup
// rm -rf matrix-bot-1
// # clone repo
// git clone https://github.com/sigmaSd/matrix-bot-1

// # build zig jail
// #zig build-lib -O ReleaseFast -dynamic jail.zig

// # build jail
// #cd matrix-bot-1/jail
// #cargo b --release
// #cd -

// # keep replit instance alive
// deno run --allow-read --allow-net --no-prompt https://deno.land/std/http/file_server.ts &>/dev/null&
// echo "started background server"

// # entry point
// deno run --allow-read --allow-net --allow-env --allow-run=nvim --unstable --no-prompt matrix-bot-1/index.ts

await $`rm -rf matrix-bot-1`.noThrow();
await $`git clone https://github.com/sigmaSd/matrix-bot-1`;

// build jail
await $`cargo b --release --offline --target-dir target`.cwd(
  "./matrix-bot-1/nvim/jail",
).printCommand();

// keep replit instance alive
//FIXME: start a server here
// deno run --allow-read --allow-net --no-prompt https://deno.land/std/http/file_server.ts &>/dev/null&
// echo "started background server"

await clientMain();
