import matrix, { MatrixClient } from "npm:matrix-js-sdk";
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

export abstract class MatrixCommand {
  protected abstract trigger: string;
  static description: string;

  async try_run(
    input: string,
  ): Promise<matrix.IContent | undefined> {
    input = input.trim();
    if (input.startsWith(this.trigger)) {
      return await this.run(
        input.replace(this.trigger, "").trimStart(),
      );
    }
  }

  protected abstract run(
    _input: string,
  ): Promise<matrix.IContent | undefined>;
}

export class DenoCommand extends MatrixCommand {
  override trigger = "!deno";
  static override description = "`!deno [input]`: Evaluate deno code";

  constructor(public denoPath: string) {
    super();
  }

  protected override async run(
    input: string,
  ): Promise<matrix.IContent> {
    const output = await this.denoEval(input, this.denoPath);
    return {
      msgtype: "m.text",
      format: "org.matrix.custom.html",
      formatted_body: '<pre><code class="language-ts">' +
        output + "</code></pre>",
      body: output,
    };
  }

  async denoEval(input: string, denoPath: string): Promise<string> {
    input = input.trim();
    // special case markdown markers
    if (input.startsWith("```")) {
      input = input.split("\n").slice(1, -1).join("\n");
    }

    const f = await Deno.makeTempFile();
    await Deno.writeTextFile(f, input);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000); // timeout
    const output = await new Deno.Command(denoPath, {
      args: ["run", "--allow-read", "--allow-net", f],
      env: { "NO_COLOR": "1" },
      signal: controller.signal,
    })
      .output();
    await Deno.remove(f);

    if (output.stdout.length !== 0) {
      return new TextDecoder().decode(output.stdout);
    }
    return new TextDecoder().decode(output.stderr);
  }
}

export class ArchWikiCommand extends MatrixCommand {
  override trigger = "!archwiki";
  static override description = "`!archwiki [input]`: Search in arch wiki";

  protected override async run(
    input: string,
  ): Promise<matrix.IContent | undefined> {
    const output = await this.archWiki(input);
    if (!output) return;
    return {
      msgtype: "m.text",
      body: output,
    };
  }

  async archWiki(message: string): Promise<string | undefined> {
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
}

/** Encode input into a QR image
 *
 * Note: needs `MatrixClient` to upload the image
 */
export class QrCommand extends MatrixCommand {
  override trigger = "!qr";
  static override description = "`!qr [input]`: encode input into a QR image";

  constructor(public client: MatrixClient) {
    super();
  }

  protected override async run(
    input: string,
  ): Promise<matrix.IContent | undefined> {
    const gifBytes = await qrcode(input).then((out) =>
      //@ts-ignore FIXME: QRcode is string?
      this.gifDataToBytes(out)
    );
    // upload the image
    const content_uri = await this.client.uploadContent(gifBytes, {
      type: "image/gif",
    }).then((r) => r.content_uri);

    return {
      msgtype: "m.image",
      url: content_uri,
      body: "QR",
    };
  }

  gifDataToBytes(gifData: string): Uint8Array {
    const decodedData = atob(gifData.slice(22));

    const binaryArray = new Uint8Array(decodedData.length);
    for (let i = 0; i < decodedData.length; i++) {
      binaryArray[i] = decodedData.charCodeAt(i);
    }

    return binaryArray;
  }
}

export class NvimEvalCommand extends MatrixCommand {
  override trigger = "!nvim";
  static override description = "`!nvim [input]`: Evaluate code in nvim";
  constructor(public nvimPath: string, public jailLibPath: string) {
    super();
  }

  protected override async run(
    input: string,
  ): Promise<matrix.IContent | undefined> {
    const output = await this.nvimEval(
      input,
      this.nvimPath,
      this.jailLibPath,
    );
    if (!output) return;
    const capedOutput = output.slice(0, 8 * 1024);
    return {
      msgtype: "m.text",
      format: "org.matrix.custom.html",
      formatted_body: "<pre><code>" +
        capedOutput + "</code></pre>",
      body: capedOutput,
    };
  }

  async nvimEval(param: string, nvimPath: string, jailLibPath: string) {
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
}

export class HelpCommand extends MatrixCommand {
  override trigger = "!help";
  static override description = "`!help`: Show Help";

  protected override run(
    _input: string,
  ): Promise<matrix.IContent> {
    const header = `IBot

code: https://github.com/sigmaSd/matrix-bot-1
hosted-on: https://replit.com/@sigmasd/matrixBot

commands:
`;
    const output = [
      ArchWikiCommand,
      DenoCommand,
      NvimEvalCommand,
      HelpCommand,
      QrCommand,
    ]
      .map((cmd) => cmd.description)
      .join("\n");

    return Promise.resolve({
      msgtype: "m.text",
      format: "org.matrix.custom.html",
      formatted_body: "<pre><code>" +
        header + output + "</code></pre>",
      body: header + output,
    });
  }
}
