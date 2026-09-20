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

## Google Drive sync setup

There's no backend server — the "backend" is a Google Drive folder, shared
between the owner's and any employees' Google accounts. Local SQLite stays
the source of truth on each device; Drive is just the transport that lets
devices exchange events. Leave `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` unset in
`.env` and the app runs standalone with a seeded demo catalog and no sync
at all — useful for trying it out before doing any of this.

### 1. Create the Google Cloud project and OAuth clients

1. In the [Google Cloud Console](https://console.cloud.google.com), create
   a new project (or reuse one you already have).
2. Enable the **Google Drive API** for that project (APIs & Services →
   Enabled APIs & services → + Enable APIs and services → search "Google
   Drive API" → Enable).
3. Configure the **OAuth consent screen** (APIs & Services → OAuth consent
   screen). Choose **External**, fill in the required fields, and add the
   scope `https://www.googleapis.com/auth/drive`. Under **Test users**, add
   the owner's and every employee's Google account email — while the app
   stays in **Testing** publishing status, only those accounts can sign in,
   and Google doesn't require any verification review. The tradeoff: in
   Testing mode, Google may periodically expire the sign-in and require
   re-authenticating (this is a Google policy on the consent screen status,
   not something this app controls). If that becomes annoying, the fix is
   submitting the app for Google's verification to move to "In production"
   — more setup, but no more periodic re-auth. Start in Testing; it's the
   simpler path and fine for a small team.
4. Create two OAuth **Client IDs** (APIs & Services → Credentials → Create
   Credentials → OAuth client ID):
   - **Web application** — no redirect URI needed for this app's use of
     it. Copy the generated **Client ID** — this is what goes in
     `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
   - **Android** — enter the package name (`com.mdcollections.shopstock`,
     already set in `app.config.ts`) and the SHA-1 fingerprint of the
     build you'll be signing APKs with. Get that fingerprint with:
     ```
     eas credentials
     ```
     Choose **Android** → the build profile you use (e.g. `preview`) →
     **Keystore: Manage everything needed to build your project** → it'll
     show the SHA-1 fingerprint (set up a new keystore first if none
     exists yet). This Android client doesn't need its ID pasted anywhere
     in the app — Google just needs it to exist, matching the package
     name and SHA-1, for the native sign-in to trust this app.

### 2. Configure the app

```
cp .env.example .env
```
Fill in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` with the **Web application**
client ID from step 1. Rebuild the app (`eas build` — this needs a real
native build, not Expo Go, since Google Sign-In is a native module).

### 3. First launch — owner

Sign in with Google, then choose **Create a new business** and give it a
name. This creates a Drive folder (named after the business) in the
owner's Drive, with the standard subfolders already set up — nothing else
to configure.

### 4. Adding an employee

From **More → Business settings → Team access**, enter the employee's
Google email and tap **Share folder** — this shares the Drive folder with
their account the same way Drive's own sharing UI would. On their phone:
sign in with that same Google account, choose **Join an existing
business**, and paste the folder link (Drive → the shared folder → Share
→ Copy link) or just the folder ID from that link.

### 5. Revoking access

Removing someone's access to the Drive folder (via Drive's own sharing
UI, or Google Workspace admin tools if this is a managed account) is the
real, unbypassable way to cut a device off. The in-app "Revoke" button
(More → Devices) is a cooperative flag well-behaved copies of the app
check on their own next sync — it's a convenience, not a security
boundary, since nothing here validates writes the way a real backend
would.

## Offline demo
A complete MD Collections catalog, suppliers, customers, and a demo owner
are seeded when the local database is empty and Google sign-in isn't
configured. No internet is required for local sales, stock, reports, or
audit history — sync (and Business settings' team features) only appear
once `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set.
