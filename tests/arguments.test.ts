import { expect, test, vi } from "vitest";
import * as nlk from "../dist/index.js";
import path from "path";
import { v3 } from "uuid";

function getUUID(value) {
  return v3(value, v3.DNS);
}

// const javaPath = path.join(import.meta.dirname, "temp/java");
// await fs.rm(javaPath, { recursive: true });
// await fs.mkdir(javaPath, { recursive: true });

function offline() {
  const uuid = getUUID("Heroz_0");
  return {
    access_token: uuid,
    client_token: uuid,
    uuid,
    name: "Heroz_0",
    user_properties: "{}",
  };
}

// mock os to linux for testing
vi.stubGlobal("process", { platform: "linux" });

const gameRoot = path.join(import.meta.dirname, "temp");

test("parse arguments correctly for 1.21.8", { timeout: 0 }, async () => {
  const versionJar = path.join(gameRoot, "1.21.8.jar");
  const args = await nlk.core.arguments.generateLaunchArguments(
    await nlk.core.version.getVersionManifest("1.21.8", gameRoot),
    path.join(gameRoot, "java"),
    path.join(gameRoot),
    versionJar,
    offline(),
  );

  console.log(args);

  const template = `${gameRoot}/java/bin/java -Xss1M -Djava.library.path=${gameRoot}/natives -Djna.tmpdir=${gameRoot}/natives -Dorg.lwjgl.system.SharedLibraryExtractPath=${gameRoot}/natives -Dio.netty.native.workdir=${gameRoot}/natives -Dminecraft.launcher.brand=nlk -Dminecraft.launcher.version=0.1.0 -cp ${gameRoot}/libraries/com/fasterxml/jackson/core/jackson-annotations/2.13.4/jackson-annotations-2.13.4.jar:${gameRoot}/libraries/com/fasterxml/jackson/core/jackson-core/2.13.4/jackson-core-2.13.4.jar:${gameRoot}/libraries/com/fasterxml/jackson/core/jackson-databind/2.13.4.2/jackson-databind-2.13.4.2.jar:${gameRoot}/libraries/com/github/oshi/oshi-core/6.6.5/oshi-core-6.6.5.jar:${gameRoot}/libraries/com/github/stephenc/jcip/jcip-annotations/1.0-1/jcip-annotations-1.0-1.jar:${gameRoot}/libraries/com/google/code/gson/gson/2.11.0/gson-2.11.0.jar:${gameRoot}/libraries/com/google/guava/failureaccess/1.0.2/failureaccess-1.0.2.jar:${gameRoot}/libraries/com/google/guava/guava/33.3.1-jre/guava-33.3.1-jre.jar:${gameRoot}/libraries/com/ibm/icu/icu4j/76.1/icu4j-76.1.jar:${gameRoot}/libraries/com/microsoft/azure/msal4j/1.17.2/msal4j-1.17.2.jar:${gameRoot}/libraries/com/mojang/authlib/6.0.58/authlib-6.0.58.jar:${gameRoot}/libraries/com/mojang/blocklist/1.0.10/blocklist-1.0.10.jar:${gameRoot}/libraries/com/mojang/brigadier/1.3.10/brigadier-1.3.10.jar:${gameRoot}/libraries/com/mojang/datafixerupper/8.0.16/datafixerupper-8.0.16.jar:${gameRoot}/libraries/com/mojang/jtracy/1.0.29/jtracy-1.0.29.jar:${gameRoot}/libraries/com/mojang/jtracy/1.0.29/jtracy-1.0.29-natives-linux.jar:${gameRoot}/libraries/com/mojang/logging/1.5.10/logging-1.5.10.jar:${gameRoot}/libraries/com/mojang/patchy/2.2.10/patchy-2.2.10.jar:${gameRoot}/libraries/com/mojang/text2speech/1.18.11/text2speech-1.18.11.jar:${gameRoot}/libraries/com/nimbusds/content-type/2.3/content-type-2.3.jar:${gameRoot}/libraries/com/nimbusds/lang-tag/1.7/lang-tag-1.7.jar:${gameRoot}/libraries/com/nimbusds/nimbus-jose-jwt/9.40/nimbus-jose-jwt-9.40.jar:${gameRoot}/libraries/com/nimbusds/oauth2-oidc-sdk/11.18/oauth2-oidc-sdk-11.18.jar:${gameRoot}/libraries/commons-codec/commons-codec/1.17.1/commons-codec-1.17.1.jar:${gameRoot}/libraries/commons-io/commons-io/2.17.0/commons-io-2.17.0.jar:${gameRoot}/libraries/commons-logging/commons-logging/1.3.4/commons-logging-1.3.4.jar:${gameRoot}/libraries/io/netty/netty-buffer/4.1.118.Final/netty-buffer-4.1.118.Final.jar:${gameRoot}/libraries/io/netty/netty-codec/4.1.118.Final/netty-codec-4.1.118.Final.jar:${gameRoot}/libraries/io/netty/netty-common/4.1.118.Final/netty-common-4.1.118.Final.jar:${gameRoot}/libraries/io/netty/netty-handler/4.1.118.Final/netty-handler-4.1.118.Final.jar:${gameRoot}/libraries/io/netty/netty-resolver/4.1.118.Final/netty-resolver-4.1.118.Final.jar:${gameRoot}/libraries/io/netty/netty-transport-classes-epoll/4.1.118.Final/netty-transport-classes-epoll-4.1.118.Final.jar:${gameRoot}/libraries/io/netty/netty-transport-native-epoll/4.1.118.Final/netty-transport-native-epoll-4.1.118.Final-linux-aarch_64.jar:${gameRoot}/libraries/io/netty/netty-transport-native-epoll/4.1.118.Final/netty-transport-native-epoll-4.1.118.Final-linux-x86_64.jar:${gameRoot}/libraries/io/netty/netty-transport-native-unix-common/4.1.118.Final/netty-transport-native-unix-common-4.1.118.Final.jar:${gameRoot}/libraries/io/netty/netty-transport/4.1.118.Final/netty-transport-4.1.118.Final.jar:${gameRoot}/libraries/it/unimi/dsi/fastutil/8.5.15/fastutil-8.5.15.jar:${gameRoot}/libraries/net/java/dev/jna/jna-platform/5.15.0/jna-platform-5.15.0.jar:${gameRoot}/libraries/net/java/dev/jna/jna/5.15.0/jna-5.15.0.jar:${gameRoot}/libraries/net/minidev/accessors-smart/2.5.1/accessors-smart-2.5.1.jar:${gameRoot}/libraries/net/minidev/json-smart/2.5.1/json-smart-2.5.1.jar:${gameRoot}/libraries/net/sf/jopt-simple/jopt-simple/5.0.4/jopt-simple-5.0.4.jar:${gameRoot}/libraries/org/apache/commons/commons-compress/1.27.1/commons-compress-1.27.1.jar:${gameRoot}/libraries/org/apache/commons/commons-lang3/3.17.0/commons-lang3-3.17.0.jar:${gameRoot}/libraries/org/apache/httpcomponents/httpclient/4.5.14/httpclient-4.5.14.jar:${gameRoot}/libraries/org/apache/httpcomponents/httpcore/4.4.16/httpcore-4.4.16.jar:${gameRoot}/libraries/org/apache/logging/log4j/log4j-api/2.24.1/log4j-api-2.24.1.jar:${gameRoot}/libraries/org/apache/logging/log4j/log4j-core/2.24.1/log4j-core-2.24.1.jar:${gameRoot}/libraries/org/apache/logging/log4j/log4j-slf4j2-impl/2.24.1/log4j-slf4j2-impl-2.24.1.jar:${gameRoot}/libraries/org/jcraft/jorbis/0.0.17/jorbis-0.0.17.jar:${gameRoot}/libraries/org/joml/joml/1.10.8/joml-1.10.8.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-freetype/3.3.3/lwjgl-freetype-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-freetype/3.3.3/lwjgl-freetype-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-glfw/3.3.3/lwjgl-glfw-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-glfw/3.3.3/lwjgl-glfw-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-jemalloc/3.3.3/lwjgl-jemalloc-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-jemalloc/3.3.3/lwjgl-jemalloc-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-openal/3.3.3/lwjgl-openal-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-openal/3.3.3/lwjgl-openal-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-opengl/3.3.3/lwjgl-opengl-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-opengl/3.3.3/lwjgl-opengl-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-stb/3.3.3/lwjgl-stb-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-stb/3.3.3/lwjgl-stb-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-tinyfd/3.3.3/lwjgl-tinyfd-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl-tinyfd/3.3.3/lwjgl-tinyfd-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3.jar:${gameRoot}/libraries/org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux.jar:${gameRoot}/libraries/org/lz4/lz4-java/1.8.0/lz4-java-1.8.0.jar:${gameRoot}/libraries/org/ow2/asm/asm/9.6/asm-9.6.jar:${gameRoot}/libraries/org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar:${gameRoot}/1.21.8.jar -Xms2G -Xmx2G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M -Dlog4j.configurationFile=${gameRoot}/client-1.21.2.xml net.minecraft.client.main.Main --username Heroz_0 --version 1.21.8 --gameDir ${gameRoot} --assetsDir ${gameRoot}/assets --assetIndex 26 --uuid eedfa943-5f0d-3cda-bf86-c5eaf2a43819 --accessToken eedfa943-5f0d-3cda-bf86-c5eaf2a43819 --clientId eedfa943-5f0d-3cda-bf86-c5eaf2a43819 --xuid eedfa943-5f0d-3cda-bf86-c5eaf2a43819 --userType msa --versionType release`;

  expect(`${args.command} ${args.args.join(" ")}`, "correct args").toBe(template);
});
