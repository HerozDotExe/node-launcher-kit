import { version as packageVersion } from "../../package.json";
import { spawn } from "child_process";
import { LaunchArguments, logger } from "../utils/types";

export function launch(
  launchArguments: LaunchArguments,
  gameRoot: string,
  logger: logger,
  detached = false,
) {
  logger("launch", `[nlk ${packageVersion}] Working directory : ${gameRoot}`);
  logger("launch",
    `[nlk ${packageVersion}] Launching command : ${launchArguments.command} ${launchArguments.args.join(" ")}`,
  );

  const process = spawn(launchArguments.command, launchArguments.args, {
    detached,
    cwd: gameRoot,
  });

  return process;
}
