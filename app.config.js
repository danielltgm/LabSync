
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim();

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...(androidGoogleMapsApiKey || iosGoogleMapsApiKey
        ? [['react-native-maps', { androidGoogleMapsApiKey, iosGoogleMapsApiKey }]]
        : []),
    ],
    extra: {
      ...config.extra,
      androidMapsConfigured: Boolean(androidGoogleMapsApiKey),
      iosGoogleMapsConfigured: Boolean(iosGoogleMapsApiKey),
    },
  };
};
