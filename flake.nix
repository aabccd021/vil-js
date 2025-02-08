{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    build-node-modules.url = "github:aabccd021/build-node-modules";
  };

  outputs = { self, nixpkgs, treefmt-nix, build-node-modules }:


    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;

      nodeModules = build-node-modules.lib.buildNodeModules pkgs ./package.json ./package-lock.json;

      treefmtEval = treefmt-nix.lib.evalModule pkgs {
        projectRootFile = "flake.nix";
        programs.prettier.enable = true;
        programs.nixpkgs-fmt.enable = true;
        programs.biome.enable = true;
        programs.shfmt.enable = true;
        settings.formatter.prettier.priority = 1;
        settings.formatter.biome.priority = 2;
        settings.global.excludes = [ "LICENSE" "*.png" ];
      };

      exportHookJs = pkgs.fetchurl {
        url = "https://unpkg.com/export-hook-js@latest/dist/export-hook.esnext.js";
        hash = "sha256-1duEckbWp4kmIm4LtYwzig0Wb1/Vp1gXmWswBtcuYVA=";
      };

      invokeHookJs = pkgs.fetchurl {
        url = "https://unpkg.com/export-hook-js@latest/dist/invoke-hook.esnext.js";
        hash = "sha256-QZ99/CdkZ8DtTWbYB8gjXkrJU7OmutioJerJO3ne+vA=";
      };

      freezePageJs = pkgs.fetchurl {
        url = "https://unpkg.com/freeze-page-js@latest/dist/freeze-page.esnext.js";
        hash = "sha256-uYQ/X9E6AiEed8Kix6oooLfvbmn6KQ0PKHfbCXGEdmU=";
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
          cp -L ${invokeHookJs} ./stories/invoke-hook.js
          cp -L ${freezePageJs} ./stories/freeze-page.js
          chmod 600 ./stories/*.js
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
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -L ${./package.json} ./package.json
        cp -Lr ${./e2e} ./e2e
        cp -Lr ${nodeModules} ./node_modules

        cp -Lr ${./stories} ./stories
        chmod 700 ./stories

        node_modules/playwright/cli.js test
        touch $out
      '';

      screenshots = pkgs.runCommandNoCCLocal "screenshots"
        {
          buildInputs = [ pkgs.nodejs serve ];
        } ''
        export XDG_CONFIG_HOME="$(pwd)"
        export XDG_CACHE_HOME="$(pwd)"
        export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
        cp -L ${./playwright.config.ts} ./playwright.config.ts
        cp -L ${./vil.ts} ./vil.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        cp -L ${./package.json} ./package.json
        cp -Lr ${nodeModules} ./node_modules

        cp -Lr ${./stories} ./stories
        chmod 700 ./stories

        cp -Lr ${./e2e} ./e2e
        chmod 700 ./e2e
        chmod 700 ./e2e/__screenshots__

        node_modules/playwright/cli.js test --update-snapshots
        mv ./e2e/__screenshots__ "$out"
      '';

      generate-screenshots = pkgs.writeShellApplication {
        name = "generate-screenshots";
        text = ''
          trap 'cd $(pwd)' EXIT
          root=$(git rev-parse --show-toplevel)
          cd "$root"
          result=$(nix build -L --no-link --print-out-paths .#screenshots)
          rm ./e2e/__screenshots__/* > /dev/null 2>&1 || true
          mkdir -p ./e2e/__screenshots__/
          cp -Lr "$result"/* ./e2e/__screenshots__/
          chmod 600 ./e2e/__screenshots__/*
        '';
      };


      dist = pkgs.runCommandNoCCLocal "dist" { } ''
        mkdir  $out
        cp -Lr ${nodeModules} ./node_modules
        cp -L ${./package.json} ./package.json
        cp -L ${./vil.ts} ./vil.ts
        cp -L ${./stories/style.css} "$out/style.css"

        ${pkgs.esbuild}/bin/esbuild ./vil.ts \
          --bundle \
          --target=es6 \
          --format=esm \
          --minify \
          --outfile="$out/vil.min.js"

        ${pkgs.esbuild}/bin/esbuild ./vil.ts \
          --bundle \
          --target=esnext \
          --format=esm \
          --minify \
          --outfile="$out/vil.esnext.min.js"

        ${pkgs.esbuild}/bin/esbuild ./vil.ts \
          --bundle \
          --target=esnext \
          --format=esm \
          --outfile="$out/vil.esnext.js"

      '';

      publish = pkgs.writeShellApplication {
        name = "publish";
        text = ''
          published_version=$(npm view . version)
          current_version=$(${pkgs.jq}/bin/jq -r .version package.json)
          if [ "$published_version" = "$current_version" ]; then
            echo "Version $current_version is already published"
            exit 0
          fi
          echo "Publishing version $current_version"

          nix flake check
          NPM_TOKEN=''${NPM_TOKEN:-}
          if [ -n "$NPM_TOKEN" ]; then
            npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
          fi
          dist_result=$(nix build --no-link --print-out-paths .#dist)
          rm -rf dist
          mkdir dist
          cp -Lr "$dist_result"/* dist
          chmod 400 dist/*
          npm publish 
        '';
      };

      packages = {
        tests = tests;
        dist = dist;
        formatting = treefmtEval.config.build.check self;
        publish = publish;
        screenshots = screenshots;
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
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright.browsers}
        '';
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

      apps.x86_64-linux.generate-screenshots = {
        type = "app";
        program = "${generate-screenshots}/bin/generate-screenshots";
      };

    };
}
