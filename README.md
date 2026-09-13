# ShopStock — MD Collections

Offline-first Android retail inventory and POS app.

## Install
`npm install`

## Run
`npx expo start`

## Type check
`npx tsc --noEmit`

## Build APK (cloud)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

## Build APK (local, requires Android SDK)
```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
```
APK: `android/app/build/outputs/apk/release/app-release.apk`

## Enable sync later
Copy `.env.example` to `.env`, fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then build again. The sync engine uses only the six specified Edge Function contracts and remains dormant without credentials.

## Offline demo
A complete MD Collections catalog, suppliers, customers, owner and employee are seeded when the local database is empty and Supabase credentials are absent. No internet is required for local sales, stock, reports or audit history.
