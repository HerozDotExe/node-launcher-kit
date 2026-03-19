import { test } from "vitest";
import { Instance } from "../dist/";
import path from "node:path";

const temp = path.join(import.meta.dirname, "temp")

test("instance", async () => {
    const instance = new Instance({
        version: "1.21.1",
        auth: {
            access_token: "token",
            client_token: "token",
            name: "player",
            user_properties: "{}",
            uuid: "uuid"
        },
        paths: { root: temp, instance: temp },
        javaExecutable: "java"
    },
        {
            modloader: {
                name: "forge",
                version: "52.1.12"
            }
        },
        {
            modloader: {
                name: "neoforge",
                version: "21.1.220"
            }
        })

    await instance.install();

    instance.on("progress", console.log);
    // const p = await instance.launch();

    // p.stdout.on("data", (d: Buffer) => {
    //     console.log(d.toString());
    // });

    // p.stderr.on("data", (d: Buffer) => {
    //     console.log(d.toString());
    // });

    // await new Promise<void>((res) => {
    //     p.on("error", (d: Buffer) => {
    //         console.log(d.toString());
    //         res();
    //     });
    //     p.on("close", () => {
    //         console.log("closed");
    //         res();
    //     });
    // });
})