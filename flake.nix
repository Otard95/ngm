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
          version = "2.0.0";
        in pkgs.buildGoModule {

          pname = "ngm";
          inherit version;

          src = ./.;

          buildInputs = with pkgs; [ git ];

          vendorHash = "sha256-TsoPc/hgYLUTwLyCNKlt1A+r4B94u1ciY7F/JCo6W1M=";
          nativeCheckInputs = with pkgs; [ less ];

        };
      }
    );
}
