import matrix from "npm:matrix-js-sdk";
import {
  access_token,
  bot_user,
  homeserver,
  remove_secrets,
} from "./config.ts";
import {
  ArchWikiCommand,
  DenoCommand,
  HelpCommand,
  MatrixCommand,
  NvimEvalCommand,
  QrCommand,
} from "./commands.ts";

export async function main(
  { nvimPath, jailLibPath, denoPath }: {
    nvimPath: string;
    jailLibPath: string;
    denoPath: string;
  },
) {
  if (!access_token || !bot_user || !homeserver) {
    throw "missing params in config";
  }

  const client = matrix.createClient({
    baseUrl: homeserver,
    accessToken: access_token,
    userId: bot_user,
  });

  remove_secrets(); // remove env variables

  const commands: MatrixCommand[] = [
    new DenoCommand(denoPath),
    new NvimEvalCommand(nvimPath, jailLibPath),
    new ArchWikiCommand(),
    new HelpCommand(),
    new QrCommand(client),
  ];

  // @ts-ignore NOTE: why does this not type check
  client.on("event", async (event: matrix.MatrixEvent) => {
    if (!event.event.content) return;
    if (event.event.sender === bot_user) return;
    if (event.event.unsigned?.age && event.event.unsigned.age > 1000 * 60) {
      return; // older than a minute
    }

    if (event.getType() === "m.room.message") {
      const message: string | undefined = event.event.content?.body;
      if (!message) return;
      console.log("room message:", message.length);

      const roomId = event.getRoomId();
      if (!roomId) return;

      for (const command of commands) {
        const content = await command.try_run(message);
        if (!content) continue;
        console.log("response:", content.body.length);

        try {
          await client.sendMessage(roomId, content);
        } catch (e) {
          console.error("sendMessage error:", e);
        }
        break;
      }
    }
  });

  await client.startClient();
  console.log("Client Started");
}
