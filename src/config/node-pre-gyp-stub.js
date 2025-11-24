const fs = require('node:fs');
const path = require('node:path');

function findBinding(packageJsonPath) {
  const packageDir = path.dirname(packageJsonPath);
  const candidates = [];

  const napiVersion = process.versions?.napi ? `napi-v${process.versions.napi}` : null;
  if (napiVersion) {
    candidates.push(path.join('lib', napiVersion, 'tfjs_binding.node'));
  }

  // Fallbacks for common directories used by tfjs-node.
  candidates.push(
    path.join('lib', 'napi-v8', 'tfjs_binding.node'),
    path.join('lib', 'napi-v9', 'tfjs_binding.node'),
    path.join('lib', 'napi-v10', 'tfjs_binding.node'),
    path.join('lib', 'napi-v11', 'tfjs_binding.node'),
  );

  for (const relative of candidates) {
    const absolute = path.resolve(packageDir, relative);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  throw new Error(
    `node-pre-gyp stub: binding file not found for package at ${packageDir}. Checked: ${candidates.join(', ')}`,
  );
}

function noopMock() {
  return false;
}

module.exports = {
  find(packageJsonPath) {
    if (typeof packageJsonPath !== 'string' || packageJsonPath.length === 0) {
      throw new TypeError('node-pre-gyp stub: package path must be a non-empty string');
    }
    return findBinding(packageJsonPath);
  },
  mockS3Http: () => noopMock,
  Run() {
    throw new Error('node-pre-gyp stub: Run is not supported in this environment');
  },
};
