import matrix from "npm:matrix-js-sdk";
import { access_token, bot_user, homeserver } from "./config.ts";

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

  // @ts-ignore NOTE: why does this not type check
  client.on("event", async (event: matrix.MatrixEvent) => {
    log(event)
    if (!event.event.content) return;
    if (event.event.sender === bot_user) return;
    if (event.event.unsigned?.age && event.event.unsigned.age > 1000) {
      return; // older than a second
    }

    if (event.getType() === "m.room.message") {
      const message: string | undefined = event.event.content?.body;
      log("room message:", message);
      if (message) {
        if (message.startsWith("!archwiki")) {
          log("looking in Arch Wiki");
          const output = await arch_wiki(message.replace("!archwiki", ""));
          log("output:", output);
          if (output) {
            const roomId = event.getRoomId();
            if (roomId) {
              await client.sendMessage(roomId, {
                msgtype: "m.notice",
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
