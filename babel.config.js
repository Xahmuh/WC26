module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // SDK 54 / Reanimated 4: nativewind/babel (via react-native-css-interop)
    // already injects 'react-native-worklets/plugin'. Do NOT add it manually
    // here — doing so double-transforms and breaks worklets.
  };
};
