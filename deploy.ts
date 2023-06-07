import { $ } from "https://deno.land/x/dax@0.31.1/mod.ts";

if (import.meta.main) {
  const commit = Deno.args[0];
  if (!commit) throw "please provide a commit message";

  const latestTag = await $`git describe --tags --abbrev=0`.text();
  const nextTag = nextSemver(latestTag);

  await $`git add . && git commit -m "${commit}"`
    .noThrow(
      Deno.env.get("FORCE") ? true : false,
    );
  await $`git tag -a ${nextTag} -m ${commit} && git push --follow-tags`;
}

function nextSemver(semver: string) {
  const [major, minor, patch] = semver.split(".").map(Number);
  const nextPatch = patch + 1;
  const nextSemver = `${major}.${minor}.${nextPatch}`;
  return nextSemver;
}
