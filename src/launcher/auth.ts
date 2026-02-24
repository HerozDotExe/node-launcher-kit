import { v3 } from "uuid";

function getUUID(value: string) {
  return v3(value, v3.DNS);
}

export function offlineAuth(username: string) {
  const uuid = getUUID(username);
  return {
    access_token: uuid,
    client_token: uuid,
    uuid,
    name: username,
    user_properties: "{}",
  };
}
