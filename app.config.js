
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim();

  const googleServicesFile = process.env.LABSYNC_ANDROID_GOOGLE_SERVICES_FILE?.trim();
  const packageName = process.env.LABSYNC_ANDROID_PACKAGE?.trim();

  return {
    ...config,
    android: {
      ...config.android,
      ...(packageName ? { package: packageName } : {}),
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      ...(androidGoogleMapsApiKey || iosGoogleMapsApiKey
        ? [['react-native-maps', { androidGoogleMapsApiKey, iosGoogleMapsApiKey }]]
        : []),
    ],
    extra: {
      ...config.extra,
      androidPushConfigured: Boolean(packageName && googleServicesFile),
      androidMapsConfigured: Boolean(androidGoogleMapsApiKey),
      iosGoogleMapsConfigured: Boolean(iosGoogleMapsApiKey),
    },
  };
};
