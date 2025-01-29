{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
  };

  outputs = { self, nixpkgs, treefmt-nix }:

    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;

      treefmtEval = treefmt-nix.lib.evalModule pkgs {
        projectRootFile = "flake.nix";
        programs.prettier.enable = true;
        programs.nixpkgs-fmt.enable = true;
        programs.biome.enable = true;
        programs.shfmt.enable = true;
        settings.formatter.prettier.priority = 1;
        settings.formatter.biome.priority = 2;
        settings.global.excludes = [ "LICENSE" "*.ico" ];
      };

      exportHookJs = pkgs.fetchurl {
        url = "https://unpkg.com/export-hook-js";
        hash = "sha256-1+gDF8hDqxbR/ZodBi28qnHP0YLBpXl6vOdU+N/yA5I=";
      };

      freezePageJs = pkgs.fetchurl {
        url = "https://unpkg.com/freeze-page-js@0.0.3";
        hash = "sha256-9ZHg3T7Gu+ig7PYfdW9a7oKEzpPnDElbJ5rD6y+g2SI=";
      };

      serve = pkgs.writeShellApplication {
        name = "serve";
        text = ''
          root=$(git rev-parse --show-toplevel)
          cp -L ${exportHookJs} ./fixtures/export-hook.js
          chmod 600 ./fixtures/export-hook.js
          cp -L ${freezePageJs} ./fixtures/freeze-page.js
          chmod 600 ./fixtures/freeze-page.js
          ${pkgs.esbuild}/bin/esbuild "$root/vil.ts" \
            --bundle \
            --target=es6 \
            --format=esm \
            --minify \
            --outfile="$root/fixtures/vil.js" \
            --servedir="$root/fixtures" \
            --sourcemap \
            --watch
        '';
      };

      check = pkgs.writeShellApplication {
        name = "check";
        text = ''
          trap 'cd $(pwd)' EXIT
          repo_root=$(git rev-parse --show-toplevel)
          cd "$repo_root" || exit
          ${pkgs.nodejs}/bin/npm install
          ${pkgs.typescript}/bin/tsc
          ${pkgs.biome}/bin/biome check --fix --error-on-warnings
          ${pkgs.nodejs}/bin/npx playwright test
        '';
      };

      packages = {
        check = check;
        formatting = treefmtEval.config.build.check self;
      };

      gcroot = packages // {
        gcroot-all = pkgs.linkFarm "gcroot-all" packages;
      };

    in

    {

      packages.x86_64-linux = gcroot;

      checks.x86_64-linux = gcroot;

      formatter.x86_64-linux = treefmtEval.config.build.wrapper;

      devShells.x86_64-linux.default = pkgs.mkShellNoCC {
        shellHook = ''
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers-chromium}
        '';
        buildInputs = [
          pkgs.nodejs
          pkgs.biome
          pkgs.typescript
          pkgs.esbuild
          serve
        ];
      };

      apps.x86_64-linux = {
        check = {
          type = "app";
          program = "${check}/bin/check";
        };
      };

      apps.x86_64-linux.serve = {
        type = "app";
        program = "${serve}/bin/serve";
      };

    };
}
