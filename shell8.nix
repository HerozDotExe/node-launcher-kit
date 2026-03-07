# modified version of https://github.com/Tomate0613/launcher-core/blob/main/flake.nix (https://github.com/Tomate0613/launcher-core/blob/abffd112adea4586b4041aad4412f14e2c5c3047/flake.nix)

{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  # Java
  packages = with pkgs; [
    jre8
    xrandr
  ];

  # Env
  __GL_THREADED_OPTIMIZATIONS = 0;
  LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath (
    with pkgs;
    [
      (lib.getLib stdenv.cc.cc)

      ## native versions
      glfw3-minecraft
      openal

      ## openal
      alsa-lib
      libjack2
      libpulseaudio
      pipewire

      ## glfw
      libGL
      libx11
      libxcursor
      libxext
      libxrandr
      libxxf86vm

      ## Old minecraft (pre-1.8)
      libxrender
      libxtst
      libxi

      udev # oshi

      flite # Text to speech (Otherwise minecraft will log an error every time it launches)
    ]
  );
}
