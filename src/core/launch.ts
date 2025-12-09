import { spawn } from "child_process";
import { LaunchArguments } from "../utils/types";

export function launch(
  launchArguments: LaunchArguments,
  gameRoot: string,
  detached = false,
) {
  console.log(`Working directory : ${gameRoot}`);
  console.log(
    `Launching command : ${launchArguments.command} ${launchArguments.args.join(" ")}`,
  );
  const process = spawn(launchArguments.command, launchArguments.args, {
    detached,
    cwd: gameRoot,
  });

  return process;
}
