import { spawn } from "child_process";
import { LaunchArguments } from "../utils/types";

export function launch(
  launchArguments: LaunchArguments,
  gameRoot: string,
  detached = false,
) {
  console.log(gameRoot)
  const process = spawn(launchArguments.command, launchArguments.args, { detached });

  console.log(process.spawnargs.join(" "))

  return process;
}
