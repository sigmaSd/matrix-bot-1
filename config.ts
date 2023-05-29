export const access_token = Deno.env.get("access_token");
export const bot_user = Deno.env.get("bot_user");
export const homeserver = Deno.env.get("homeserver");

export const remove_secrets = () => {
  Deno.env.delete("access_token");
  Deno.env.delete("bot_user");
  Deno.env.delete("homeserver");
};
