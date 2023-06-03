import { $ } from "https://deno.land/x/dax@0.31.1/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { main as clientMain } from "./client.ts";

// clean up and clone repo
await $`rm -rf matrix-bot-1`.noThrow();
await $`git clone https://github.com/sigmaSd/matrix-bot-1`;

// build nvim jail
await $`cargo b --release --offline --target-dir target`
  .cwd(
    "./matrix-bot-1/nvim/jail",
  );

// keep replit instance alive
serve(() => new Response("", { status: 200 }), { port: 8080 });

// start matrix client
await clientMain();
