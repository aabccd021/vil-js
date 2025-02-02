{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    project-utils = {
      url = "github:aabccd021/project-utils";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, treefmt-nix, project-utils }:


    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      utilLib = project-utils.lib;

      nodeModules = utilLib.buildNodeModules.fromLockJson ./package.json ./package-lock.json;

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
        url = "https://unpkg.com/freeze-page-js";
        hash = "sha256-9ZHg3T7Gu+ig7PYfdW9a7oKEzpPnDElbJ5rD6y+g2SI=";
      };

      serve = pkgs.writeShellApplication {
        name = "serve";
        text = ''
          trap 'cd $(pwd)' EXIT
          if command -v git &> /dev/null; then
            root=$(git rev-parse --show-toplevel)
            cd "$root"
          fi

          cp -L ${exportHookJs} ./stories/export-hook.js
          chmod 600 ./stories/export-hook.js
          cp -L ${freezePageJs} ./stories/freeze-page.js
          chmod 600 ./stories/freeze-page.js
          ${pkgs.esbuild}/bin/esbuild ./vil.ts \
            --bundle \
            --target=esnext \
            --format=esm \
            --minify \
            --outfile=./stories/vil.js \
            --servedir=./stories \
            --sourcemap \
            --watch
        '';
      };

      tests = pkgs.runCommandNoCCLocal "tests"
        {
          buildInputs = [ pkgs.nodejs serve ];
        } ''
        export XDG_CONFIG_HOME="$(pwd)"
        export XDG_CACHE_HOME="$(pwd)"
        export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./vil.ts} ./vil.ts
        cp -L ${./vil.test.ts} ./vil.test.ts
        cp -Lr ${nodeModules} ./node_modules
        cp -Lr ${./stories} ./stories
        chmod -R 700 ./stories
        node_modules/playwright/cli.js test
        touch $out
      '';

      dist = pkgs.runCommandNoCCLocal "dist" { } ''
        mkdir  $out
        cp -Lr ${nodeModules} ./node_modules
        cp -L ${./package.json} ./package.json
        cp -L ${./vil.ts} ./vil.ts
        ${pkgs.esbuild}/bin/esbuild ./vil.ts \
          --bundle \
          --target=es6 \
          --format=esm \
          --minify \
          --sourcemap \
          --outfile="$out/vil.min.js"
        ${pkgs.esbuild}/bin/esbuild ./vil.ts \
          --bundle \
          --target=esnext \
          --format=esm \
          --minify \
          --sourcemap \
          --outfile="$out/vil.esnext.min.js"
      '';

      publish = pkgs.writeShellApplication {
        name = "publish";
        text = ''
          nix flake check
          NPM_TOKEN=''${NPM_TOKEN:-}
          if [ -n "$NPM_TOKEN" ]; then
            npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
          fi
          result=$(nix build --no-link --print-out-paths .#dist)
          rm -rf dist
          mkdir dist
          cp -Lr "$result"/* dist
          chmod 400 dist/*
          npm publish --dry-run
          npm publish || true
        '';
      };

      packages = {
        tests = tests;
        dist = dist;
        formatting = treefmtEval.config.build.check self;
        publish = publish;
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
        buildInputs = [
          pkgs.nodejs
          pkgs.biome
          pkgs.typescript
          serve
        ];
      };

      apps.x86_64-linux.serve = {
        type = "app";
        program = "${serve}/bin/serve";
      };

      apps.x86_64-linux.publish = {
        type = "app";
        program = "${publish}/bin/publish";
      };

    };
}
