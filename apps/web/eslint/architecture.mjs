import path from "node:path";

const sourceRoot = path.resolve(import.meta.dirname, "../src");
const forbiddenLayers = {
  app: [],
  contracts: ["app", "data", "components", "features", "lib"],
  lib: ["app", "data", "components", "features"],
  components: ["app", "data", "features"],
  data: ["app", "components", "features"],
  features: ["app"],
};

export const dependencyDirection = {
  meta: {
    type: "problem",
    schema: [],
    messages: { boundary: "{{from}} must not import {{to}}. Follow the repository dependency direction." },
  },
  create(context) {
    const filename = context.filename;
    const relative = path.relative(sourceRoot, filename);
    const layer = relative.split(path.sep)[0];
    if (!forbiddenLayers[layer] || /\.test\.[cm]?[jt]sx?$/.test(filename)) return {};

    function check(node, value) {
      if (typeof value !== "string") return;
      const resolved = value.startsWith("@/")
        ? path.resolve(sourceRoot, value.slice(2))
        : value.startsWith(".") ? path.resolve(path.dirname(filename), value) : null;
      const target = resolved ? path.relative(sourceRoot, resolved).split(path.sep)[0] : null;
      const rawDatabase = value === "pg" || value.startsWith("pg/") ||
        (resolved && /^data\/database(?:\.[cm]?[jt]s)?$/.test(path.relative(sourceRoot, resolved)));
      if ((target && forbiddenLayers[layer].includes(target)) || (rawDatabase && layer !== "data")) {
        context.report({ node, messageId: "boundary", data: { from: layer, to: value } });
      }
    }
    return {
      ImportDeclaration: node => check(node, node.source.value),
      ExportNamedDeclaration: node => node.source && check(node, node.source.value),
      ExportAllDeclaration: node => check(node, node.source.value),
      ImportExpression: node => check(node, node.source.value),
      CallExpression: node => {
        if (node.callee.type === "Identifier" && node.callee.name === "require") {
          check(node, node.arguments[0]?.value);
        }
      },
    };
  },
};
