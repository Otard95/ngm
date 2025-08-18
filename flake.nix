{
  description = "A basic flake with a shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.systems.url = "github:nix-systems/default";
  inputs.flake-utils = {
    url = "github:numtide/flake-utils";
    inputs.systems.follows = "systems";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            go
            cobra-cli
          ];
        };

        packages.default = let
          version = "2.1.0";
        in pkgs.buildGoModule {

          pname = "ngm";
          inherit version;

          src = ./.;

          buildInputs = with pkgs; [ git ];

          vendorHash = "sha256-7Kqjluou1R9DtBDIIaSy0p+Qi6XxyYPqOnJGGk6B+6k=";
          nativeCheckInputs = with pkgs; [ less ];

        };
      }
    );
}
