import matrix from "npm:matrix-js-sdk";
import stripAnsi from "npm:strip-ansi";
import {
  access_token,
  bot_user,
  homeserver,
  remove_secrets,
} from "./config.ts";

//FIXME replit have an old version of nvim

const log = console.log;
if (import.meta.main) {
  if (!access_token || !bot_user || !homeserver) {
    throw "missing params in config";
  }

  const client = matrix.createClient({
    baseUrl: homeserver,
    accessToken: access_token,
    userId: bot_user,
  });

  remove_secrets(); // remove env variables

  // @ts-ignore NOTE: why does this not type check
  client.on("event", async (event: matrix.MatrixEvent) => {
    if (!event.event.content) return;
    if (event.event.sender === bot_user) return;
    if (event.event.unsigned?.age && event.event.unsigned.age > 1000 * 60) {
      return; // older than a minute
    }

    if (event.getType() === "m.room.message") {
      const message: string | undefined = event.event.content?.body;
      log("room message:", message);
      if (message) {
        let output;
        if (message.startsWith("!archwiki")) {
          log("looking in Arch Wiki");
          output = await arch_wiki(message.replace("!archwiki", ""));
          log("output:", output);
          if (output) {
            const roomId = event.getRoomId();
            if (roomId) {
              await client.sendMessage(roomId, {
                msgtype: "m.text",
                body: output,
              });
            }
          }
        } else if (message.startsWith("!nvim")) {
          log("looking in nvim");
          output = await nvim(message.replace("!nvim", ""));
          log("output:", output);
          if (output) {
            const roomId = event.getRoomId();
            if (roomId) {
              await client.sendMessage(roomId, {
                msgtype: "m.text",
                format: "org.matrix.custom.html",
                formatted_body: "<pre><code>" + output + "</code></pre>",
                body: output,
              });
            }
          }
        }
      }
    }
  });

  await client.startClient();
  console.log("Client Started");
}

async function arch_wiki(message: string): Promise<string | undefined> {
  log("m:", message);
  const resp = await fetch(
    `https://wiki.archlinux.org/rest.php/v1/search/title?q=${message}&limit=1`,
  ).then((r) => r.json());
  return resp.pages
    // deno-lint-ignore no-explicit-any
    .map((output: any) => output.title)
    .map((title: string) =>
      `https://wiki.archlinux.org/title/${encodeURIComponent(title)}`
    ).at(0);
}

async function nvim(param: string) {
  const cmd = await new Deno.Command("nvim", {
    args: ["-c", param, "-c", "qa!"],
    stdout: "piped",
    stderr: "piped",
  }).output();

  let output;
  if (cmd.stdout.length !== 0) {
    output = new TextDecoder().decode(cmd.stdout);
  } else if (cmd.stderr.length !== 0) {
    output = new TextDecoder().decode(cmd.stderr);
  }
  if (output) {
    return stripAnsi(output);
  }
}
