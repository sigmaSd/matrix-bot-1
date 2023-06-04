import matrix from "npm:matrix-js-sdk";
import {
  access_token,
  bot_user,
  homeserver,
  remove_secrets,
} from "./config.ts";

const log = console.log;

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
        if (message.startsWith("!archwiki")) {
          log("looking in Arch Wiki");
          const output = await arch_wiki(message.replace("!archwiki", ""));
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
          const output = await nvimEval(
            message.replace("!nvim", ""),
            nvimPath,
            jailLibPath,
          );
          log("output:", output);
          if (output) {
            const roomId = event.getRoomId();
            const capedOutput = output.slice(0, 65 * 1024 / 3);
            if (roomId) {
              try {
                await client.sendMessage(roomId, {
                  msgtype: "m.text",
                  format: "org.matrix.custom.html",
                  formatted_body: "<pre><code>" +
                    capedOutput + "</code></pre>",
                  body: capedOutput,
                });
              } catch (error) {
                console.error("failed to send message:", error);
              }
            }
          }
        } else if (message.startsWith("!deno")) {
          log("executing deno");
          const output = await denoEval(
            message.replace("!deno", ""),
            denoPath,
          );
          log("output:", output);
          if (output) {
            const roomId = event.getRoomId();
            if (roomId) {
              try {
                await client.sendMessage(roomId, {
                  msgtype: "m.text",
                  format: "org.matrix.custom.html",
                  formatted_body: '<pre><code class="language-ts">' +
                    output + "</code></pre>",
                  body: output,
                });
              } catch (error) {
                console.error("failed to send message:", error);
              }
            }
          }
        } else if (message.startsWith("!help")) {
          log("executing help");
          const output =
            "!archwiki <input>\n!nvim <input>\n!deno <input>\n!help <input>";
          log("output:", output);
          const roomId = event.getRoomId();
          if (roomId) {
            try {
              await client.sendMessage(roomId, {
                msgtype: "m.text",
                body: output,
              });
            } catch (error) {
              console.error("failed to send message:", error);
            }
          }
        }
      }
    }
  });

  await client.startClient();
  log("Client Started");
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

async function nvimEval(param: string, nvimPath: string, jailLibPath: string) {
  const cmd = await new Deno.Command(nvimPath, {
    args: [
      "--headless",
      "-c",
      //FIXME: remove the hardcoded path
      "so matrix-bot-1/nvim/screendump.lua",
      "-c",
      "set shada=",
      "--cmd",
      param,
      "-c",
      "qa!",
    ],
    stdout: "piped",
    stderr: "piped",
    env: { "LD_PRELOAD": jailLibPath },
  }).output();

  let output;
  if (cmd.stdout.length !== 0) {
    output = new TextDecoder().decode(cmd.stdout);
  } else if (cmd.stderr.length !== 0) {
    output = new TextDecoder().decode(cmd.stderr);
  }
  if (output) {
    return (output);
  }
}

async function denoEval(input: string, denoPath: string): Promise<string> {
  input = input.trim();
  // special case markdown markers
  if (input.startsWith("```")) {
    input = input.split("\n").slice(1, -1).join("\n");
  }

  const f = await Deno.makeTempFile();
  await Deno.writeTextFile(f, input);
  const output = await new Deno.Command(denoPath, {
    args: ["run", f],
    env: { "NO_COLOR": "1" },
  })
    .output();
  await Deno.remove(f);

  if (output.stdout.length !== 0) {
    return new TextDecoder().decode(output.stdout);
  }
  return new TextDecoder().decode(output.stderr);
}
