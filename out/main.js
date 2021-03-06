"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAppConfiguration = getAppConfiguration;
exports.getMainConfiguration = getMainConfiguration;
exports.getRendererConfiguration = getRendererConfiguration;
exports.getDllConfiguration = getDllConfiguration;
exports.getTestConfiguration = getTestConfiguration;
exports.createConfigurator = createConfigurator;
exports.configure = configure;
exports.WebpackConfigurator = void 0;

function _bluebirdLst() {
  const data = _interopRequireDefault(require("bluebird-lst"));

  _bluebirdLst = function () {
    return data;
  };

  return data;
}

function _fsExtraP() {
  const data = require("fs-extra-p");

  _fsExtraP = function () {
    return data;
  };

  return data;
}

function _lazyVal() {
  const data = require("lazy-val");

  _lazyVal = function () {
    return data;
  };

  return data;
}

var path = _interopRequireWildcard(require("path"));

function _readConfigFile() {
  const data = require("read-config-file");

  _readConfigFile = function () {
    return data;
  };

  return data;
}

function _deepAssign() {
  const data = require("read-config-file/out/deepAssign");

  _deepAssign = function () {
    return data;
  };

  return data;
}

require("source-map-support/register");

function _webpackMerge() {
  const data = _interopRequireDefault(require("webpack-merge"));

  _webpackMerge = function () {
    return data;
  };

  return data;
}

function _ts() {
  const data = require("./configurators/ts");

  _ts = function () {
    return data;
  };

  return data;
}

function _vue() {
  const data = require("./configurators/vue/vue");

  _vue = function () {
    return data;
  };

  return data;
}

function _BaseTarget() {
  const data = require("./targets/BaseTarget");

  _BaseTarget = function () {
    return data;
  };

  return data;
}

function _MainTarget() {
  const data = require("./targets/MainTarget");

  _MainTarget = function () {
    return data;
  };

  return data;
}

function _RendererTarget() {
  const data = require("./targets/RendererTarget");

  _RendererTarget = function () {
    return data;
  };

  return data;
}

function _util() {
  const data = require("./util");

  _util = function () {
    return data;
  };

  return data;
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const _debug = require("debug"); // noinspection JSUnusedGlobalSymbols


function getAppConfiguration(env) {
  return _bluebirdLst().default.filter([configure("main", env), configure("renderer", env)], it => it != null);
} // noinspection JSUnusedGlobalSymbols


function getMainConfiguration(env) {
  return configure("main", env);
} // noinspection JSUnusedGlobalSymbols


function getRendererConfiguration(env) {
  return configure("renderer", env);
} // in the future, if need, isRenderer = true arg can be added
// noinspection JSUnusedGlobalSymbols


function getDllConfiguration(env) {
  return configure("renderer-dll", env);
} // noinspection JSUnusedGlobalSymbols


async function getTestConfiguration(env) {
  const configurator = await createConfigurator("test", env);
  return await configurator.configure({
    testComponents: path.join(process.cwd(), "src/renderer/components/testComponents.ts")
  });
}

class WebpackConfigurator {
  constructor(type, env, electronWebpackConfiguration, metadata) {
    this.type = type;
    this.env = env;
    this.electronWebpackConfiguration = electronWebpackConfiguration;
    this.metadata = metadata;
    this.electronVersionPromise = new (_lazyVal().Lazy)(() => getInstalledElectronVersion(this.projectDir));
    this.isTest = this.type === "test";
    this.debug = _debug(`electron-webpack:${this.type}`);
    this._configuration = null;
    this.rules = [];
    this.plugins = []; // js must be first - e.g. iview has two files loading-bar.js and loading-bar.vue - when we require "loading-bar", js file must be resolved and not vue

    this.extensions = [".js", ".json", ".node"];
    this._electronVersion = null;
    this.entryFiles = [];

    if (electronWebpackConfiguration.renderer === undefined) {
      electronWebpackConfiguration.renderer = {};
    }

    if (electronWebpackConfiguration.main === undefined) {
      electronWebpackConfiguration.main = {};
    }

    if (metadata.dependencies == null) {
      metadata.dependencies = {};
    }

    if (metadata.devDependencies == null) {
      metadata.devDependencies = {};
    }

    this.projectDir = electronWebpackConfiguration.projectDir || process.cwd();
    this.isRenderer = type.startsWith("renderer");
    process.env.BABEL_ENV = type;
    this.isProduction = this.env.production == null ? process.env.NODE_ENV === "production" : this.env.production;
    this.debug(`isProduction: ${this.isProduction}`);
    this.sourceDir = this.getSourceDirectory(this.type);
    const commonSourceDirectory = this.electronWebpackConfiguration.commonSourceDirectory;
    this.commonSourceDirectory = commonSourceDirectory == null ? path.join(this.projectDir, "src", "common") : path.resolve(this.projectDir, commonSourceDirectory);
  }

  get config() {
    return this._configuration;
  }

  get electronVersion() {
    return this._electronVersion;
  }
  /**
   * Returns null if code processing for type is disabled.
   */


  getSourceDirectory(type) {
    const part = this.getPartConfiguration(type);

    if (part === null || part != null && part.sourceDirectory === null) {
      // part or sourceDirectory is explicitly set to null
      return null;
    }

    const result = part == null ? null : part.sourceDirectory;

    if (result == null) {
      return path.join(this.projectDir, "src", type.startsWith("renderer") || type === "test" ? "renderer" : type);
    } else {
      return path.resolve(this.projectDir, result);
    }
  }

  getPartConfiguration(type) {
    if (type === "main") {
      return this.electronWebpackConfiguration.main;
    } else {
      return this.electronWebpackConfiguration.renderer;
    }
  }

  get commonDistDirectory() {
    return path.join(this.projectDir, "dist");
  }

  hasDependency(name) {
    return name in this.metadata.dependencies || this.hasDevDependency(name);
  }

  hasDevDependency(name) {
    return name in this.metadata.devDependencies;
  }
  /**
   * Returns the names of devDependencies that match a given string or regex.
   * If no matching dependencies are found, an empty array is returned.
   *
   * @return list of matching dependency names, e.g. `['babel-preset-react', 'babel-preset-stage-0']`
   */


  getMatchingDevDependencies(options = {}) {
    const includes = options.includes || [];
    const excludes = new Set(options.excludes || []);
    return Object.keys(this.metadata.devDependencies).filter(name => !excludes.has(name) && includes.some(prefix => name.startsWith(prefix)));
  }

  async configure(entry) {
    this._configuration = {
      context: this.projectDir,
      devtool: this.isProduction || this.isTest ? "nosources-source-map" : "eval-source-map",
      externals: this.computeExternals(),
      node: {
        __dirname: !this.isProduction,
        __filename: !this.isProduction
      },
      output: {
        filename: "[name].js",
        chunkFilename: "[name].bundle.js",
        libraryTarget: "commonjs2",
        path: path.join(this.commonDistDirectory, this.type)
      },
      target: this.isTest ? "node" : `electron-${this.type === "renderer-dll" ? "renderer" : this.type}`,
      resolve: {
        alias: {
          "@": this.sourceDir,
          common: this.commonSourceDirectory
        },
        extensions: this.extensions
      },
      module: {
        rules: this.rules
      },
      plugins: this.plugins
    };

    if (entry != null) {
      this._configuration.entry = entry;
    } // if electronVersion not specified, use latest


    this._electronVersion = this.electronWebpackConfiguration.electronVersion || (await this.electronVersionPromise.value) || "1.8.2";

    const target = (() => {
      switch (this.type) {
        case "renderer":
          return new (_RendererTarget().RendererTarget)();

        case "renderer-dll":
          return new (_RendererTarget().BaseRendererTarget)();

        case "test":
          return new (_RendererTarget().BaseRendererTarget)();

        case "main":
          return new (_MainTarget().MainTarget)();

        default:
          return new (_BaseTarget().BaseTarget)();
      }
    })();

    this.debug(`Target class: ${target.constructor.name}`);
    target.configureRules(this);
    await Promise.all([target.configurePlugins(this), (0, _ts().configureTypescript)(this)]);
    (0, _vue().configureVue)(this);

    if (this.debug.enabled) {
      this.debug(`\n\n${this.type} config:` + JSON.stringify(this._configuration, null, 2) + "\n\n");
    }

    if (this.config.entry == null) {
      this.entryFiles.push((await computeEntryFile(this.sourceDir, this.projectDir)));
      this.config.entry = {
        [this.type]: this.entryFiles
      };
      const mainConfiguration = this.electronWebpackConfiguration.main || {};
      let extraEntries = mainConfiguration.extraEntries;

      if (this.type === "main" && extraEntries != null) {
        if (typeof extraEntries === "string") {
          extraEntries = [extraEntries];
        }

        if (Array.isArray(extraEntries)) {
          for (const p of extraEntries) {
            this.config.entry[path.basename(p, path.extname(p))] = p;
          }
        } else {
          Object.assign(this.config.entry, extraEntries);
        }
      }
    }

    this.applyCustomModifications();
    return this.config;
  }

  applyCustomModifications() {
    if (this.type === "renderer" && this.electronWebpackConfiguration.renderer && this.electronWebpackConfiguration.renderer.webpackConfig) {
      this._configuration = _webpackMerge().default.smart(this._configuration, require(path.join(this.projectDir, this.electronWebpackConfiguration.renderer.webpackConfig)));
    }

    if (this.type === "renderer-dll" && this.electronWebpackConfiguration.renderer && this.electronWebpackConfiguration.renderer.webpackDllConfig) {
      this._configuration = _webpackMerge().default.smart(this._configuration, require(path.join(this.projectDir, this.electronWebpackConfiguration.renderer.webpackDllConfig)));
    }

    if (this.type === "main" && this.electronWebpackConfiguration.main && this.electronWebpackConfiguration.main.webpackConfig) {
      this._configuration = _webpackMerge().default.smart(this._configuration, require(path.join(this.projectDir, this.electronWebpackConfiguration.main.webpackConfig)));
    }
  }

  computeExternals() {
    const whiteListedModules = new Set(this.electronWebpackConfiguration.whiteListedModules || []);

    if (this.isRenderer) {
      whiteListedModules.add("vue");
    }

    const filter = name => !name.startsWith("@types/") && (whiteListedModules == null || !whiteListedModules.has(name));

    const externals = Object.keys(this.metadata.dependencies).filter(filter);
    externals.push("electron");
    externals.push("webpack"); // because electron-devtools-installer specified in the devDependencies, but required in the index.dev

    externals.push("electron-devtools-installer");

    if (this.type === "main") {
      externals.push("webpack/hot/log-apply-result");
      externals.push("electron-webpack/out/electron-main-hmr/HmrClient");
      externals.push("source-map-support/source-map-support.js");
    }

    if (this.electronWebpackConfiguration.externals != null) {
      return externals.concat(this.electronWebpackConfiguration.externals);
    }

    return externals;
  }

}

exports.WebpackConfigurator = WebpackConfigurator;
const schemeDataPromise = new (_lazyVal().Lazy)(() => (0, _fsExtraP().readJson)(path.join(__dirname, "..", "scheme.json")));

async function createConfigurator(type, env) {
  if (env != null) {
    // allow to pass as `--env.autoClean=false` webpack arg
    const _env = env;

    for (const name of ["minify", "autoClean", "production"]) {
      if (_env[name] === "true") {
        _env[name] = true;
      } else if (_env[name] === "false") {
        _env[name] = false;
      }
    }
  }

  if (env == null) {
    env = {};
  }

  const projectDir = (env.configuration || {}).projectDir || process.cwd();
  const packageMetadata = await (0, _util().orNullIfFileNotExist)((0, _fsExtraP().readJson)(path.join(projectDir, "package.json")));
  const electronWebpackConfig = ((await (0, _readConfigFile().getConfig)({
    packageKey: "electronWebpack",
    configFilename: "electron-webpack",
    projectDir,
    packageMetadata: new (_lazyVal().Lazy)(() => Promise.resolve(packageMetadata))
  })) || {}).result || {};

  if (env.configuration != null) {
    (0, _deepAssign().deepAssign)(electronWebpackConfig, env.configuration);
  }

  await (0, _readConfigFile().validateConfig)(electronWebpackConfig, schemeDataPromise, message => {
    return `${message}

How to fix:
1. Open https://webpack.electron.build/options
2. Search the option name on the page.
  * Not found? The option was deprecated or not exists (check spelling).
  * Found? Check that the option in the appropriate place. e.g. "sourceDirectory" only in the "main" or "renderer", not in the root.
`;
  });
  return new WebpackConfigurator(type, env, electronWebpackConfig, packageMetadata);
}

async function configure(type, env) {
  const configurator = await createConfigurator(type, env);
  const sourceDir = configurator.sourceDir; // explicitly set to null - do not handle at all and do not show info message

  if (sourceDir === null) {
    return null;
  } else {
    return await configurator.configure();
  }
}

async function computeEntryFile(srcDir, projectDir) {
  const candidates = [];

  for (const ext of ["ts", "js", "tsx"]) {
    for (const name of ["index", "main", "app"]) {
      candidates.push(`${name}.${ext}`);
    }
  }

  const file = await (0, _util().getFirstExistingFile)(candidates, srcDir);

  if (file == null) {
    throw new Error(`Cannot find entry file ${path.relative(projectDir, path.join(srcDir, "index.ts"))} (or main.ts, or app.ts, or index.js, or main.js, or app.js)`);
  }

  return file;
}

async function getInstalledElectronVersion(projectDir) {
  for (const name of ["electron", "electron-prebuilt", "electron-prebuilt-compile"]) {
    try {
      return (await (0, _fsExtraP().readJson)(path.join(projectDir, "node_modules", name, "package.json"))).version;
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  }
} 
//# sourceMappingURL=main.js.map