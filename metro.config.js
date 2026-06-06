const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });

// ── NativeWind / css-interop resolution shim (Expo SDK 54 / Metro 0.83) ──────
// Expo SDK 54 enables Metro package exports by default. NativeWind's generated
// `.cache/<platform>.js` imports `react-native-css-interop` BY NAME from inside
// the package itself (a "self-import"). css-interop 0.2.4 ships no `exports`
// map, so Metro's package-exports resolver fails that self-import even though
// the file exists — Node's legacy resolver finds it fine. We try Metro's
// resolver first (so package exports stays on for the whole tree) and only fall
// back to Node's resolver for css-interop specifiers it can't resolve.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    return defaultResolveRequest
      ? defaultResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    if (moduleName.startsWith('react-native-css-interop/')) {
      return { type: 'sourceFile', filePath: require.resolve(moduleName) };
    }
    throw error;
  }
};

module.exports = config;
