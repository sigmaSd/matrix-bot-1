const decoder = new TextDecoder();
export async function zigEval(code: string) {
  const f = await Deno.makeTempFile({ suffix: ".zig" });
  const fullCode = `\
const std = @import("std");
const print = std.debug.print;
pub fn main() !void {
  ${code}
}
  `;
  await Deno.writeTextFile(f, fullCode);
  const output = await new Deno.Command("zig", { args: ["run", f] }).output();
  if (output.stderr.length !== 0) return decoder.decode(output.stderr);
  else return decoder.decode(output.stdout);
}
