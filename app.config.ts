export default {
  name: 'ShopStock',
  slug: 'shopstock',
  scheme: 'shopstock',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  android: {
    package: 'com.mdcollections.shopstock',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#115FE6',
    },
    permissions: ['CAMERA'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-camera', { cameraPermission: 'Allow ShopStock to scan barcodes.' }],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow ShopStock to use your photos for product images.',
        cameraPermission: 'Allow ShopStock to take product photos.',
      },
    ],
    '@react-native-google-signin/google-signin',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: {
      projectId: '70eac2a5-09ff-486c-a5ed-9034a1e2221e',
    },
  },
};