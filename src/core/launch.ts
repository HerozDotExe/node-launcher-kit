import { version as packageVersion } from "../../package.json";
import { spawn } from "child_process";
import { LaunchArguments } from "../utils/types";

export function launch(
  launchArguments: LaunchArguments,
  gameRoot: string,
  detached = false,
) {
  console.log(`[nlk ${packageVersion}] Working directory : ${gameRoot}`);
  console.log(
    `[nlk ${packageVersion}] Launching command : ${launchArguments.command} ${launchArguments.args.join(" ")}`,
  );

  const process = spawn(launchArguments.command, launchArguments.args, {
    detached,
    cwd: gameRoot,
  });

  return process;
}
