// Expo reads app.json, then hands it here. A fork build (APP_VARIANT=fork) installs beside the original Pulse Mobile
// (in.portlabs.pulse) under its own Android package, so neither replaces the other's data; it keeps the name "Pulse".
// Every other build is app.json unchanged. Config plugins read the package from here (withAppShortcuts targets it).
module.exports = ({ config }) =>
  process.env.APP_VARIANT === "fork" ? { ...config, android: { ...config.android, package: "in.portlabs.pulse.fork" } } : config;
