import { execSync } from 'child_process';
import os from 'os';
import * as esbuild from 'esbuild';

const COLORS = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  stop: '\x1b[39m',
};

const outDirName = 'dist';

buildPackageConfig();

async function buildPackageConfig() {
  cleanDistDirectory();

  await build();

  console.log(`${os.EOL}${COLORS.blue}DONE !!!${COLORS.stop}${os.EOL}`);
}

function cleanDistDirectory() {
  console.log(`${COLORS.green}- Step 1:${COLORS.stop} clear the ${outDirName} directory`);
  if (os.platform() === 'win32') {
    execSync(`rd /s /q ${outDirName}`);
  } else {
    execSync(`rm -rf ${outDirName}`);
  }
}

async function build() {
  console.log(`${COLORS.green}- Step 2:${COLORS.stop} build the output dir`);

  await esbuild.build({
    entryPoints: ['src/start-server.ts'],
    bundle: true,
    outfile: `${outDirName}/index.js`,
    sourcemap: true, // <--- defaults to `false`. for 'node', create sourcemaps is for development only.
    minify: false, // <--- defaults to `false`.
    platform: 'node', // <--- defaults to 'browser'. If you're creating a CLI tool, use 'node' value. Setting platform to 'node' is beneficial when for example, all packages that are built-in to node such as fs are automatically marked as external so esbuild doesn't try to bundle them.
    format: 'cjs', // <--- Using CommonJS format since our dependencies use this format. When platform is set to 'node', this defaults to 'cjs'.
    tsconfig: './tsconfig.json', // <--- Normally the build API automatically discovers tsconfig.json files and reads their contents during a build. However, you can also configure a custom tsconfig.json file to use instead. This can be useful if you need to do multiple builds of the same code with different settings.
    treeShaking: true, // <--- defaults to `true`. Removes dead code.
    keepNames: true, // <--- defaults to `false`. If you want to keep the names of the original files, set this to `true`. This is useful for debugging.
    packages: 'bundle', // <--- Bundle all packages (including workspace packages)
    conditions: [], // <--- If no custom conditions are configured, the Webpack-specific module condition is also included. The module condition is used by package authors to provide a tree-shakable ESM alternative to a CommonJS file without creating a dual package hazard. You can prevent the module condition from being included by explicitly configuring some custom conditions (even an empty list).
    external: [],
  });
}
