{
  description = "SSO dev env with NestJS and Spring Boot";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";

  outputs = { self, nixpkgs }: let
    pkgs = nixpkgs.legacyPackages.x86_64-linux;
    javaHome = "${pkgs.openjdk17}/lib/openjdk";
  in {
    devShells.x86_64-linux.default = pkgs.mkShell {
      packages = with pkgs; [
        nodejs_20
        nodePackages."@angular/cli"
        nest-cli
        typescript
        esbuild

        maven
        gradle_8
        spring-boot-cli
        openjdk17

        jetbrains.idea-community
      ];

      shellHook = ''
        export JAVA_HOME=${javaHome}
        export PATH=$JAVA_HOME/bin:$PATH
        echo "Dev environment for SSO (NestJS + Spring Boot + Angular) ready."
      '';
    };
  };
}
