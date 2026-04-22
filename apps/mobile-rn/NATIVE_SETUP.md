# Native Setup Instructions — React Native CLI

> Run these steps AFTER `npx react-native init RestaurantApp --template react-native-template-typescript`
> and copying the `src/` folder into the project.

---

## 1. Install Dependencies

```bash
npm install
# or
yarn install
```

---

## 2. Android Setup (`android/`)

### `android/build.gradle`
```groovy
buildscript {
    ext {
        minSdkVersion = 24          // Android 7.0
        compileSdkVersion = 34
        targetSdkVersion = 34
    }
}
```

### `android/app/build.gradle`
```groovy
// Enable Hermes
project.ext.react = [
    enableHermes: true
]

// ProGuard for release
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        signingConfig signingConfigs.release
    }
}

// Release signing
signingConfigs {
    release {
        storeFile file('release-key.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'YOUR_KEY_ALIAS'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}
```

### `android/app/src/main/AndroidManifest.xml`
```xml
<!-- Permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Deep Linking inside <activity> -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="restaurantapp" />
</intent-filter>
```

### Notification Channels (created at runtime in `services/notifications.ts`)
- `orders` — New order alerts
- `kitchen` — Kitchen ready alerts
- `inventory` — Low stock alerts

### Firebase
- Place `google-services.json` in `android/app/`
- Add to `android/build.gradle`:
  ```groovy
  classpath 'com.google.gms:google-services:4.4.0'
  ```
- Add to `android/app/build.gradle`:
  ```groovy
  apply plugin: 'com.google.gms.google-services'
  ```

---

## 3. iOS Setup (`ios/`)

### Podfile
```ruby
platform :ios, '13.0'

# Add Firebase pods
pod 'Firebase', :modular_headers => true
pod 'FirebaseCoreInternal', :modular_headers => true
pod 'GoogleUtilities', :modular_headers => true

# Vision Camera
pod 'VisionCamera', :path => '../node_modules/react-native-vision-camera'

# After defining target:
use_frameworks! :linkage => :static
```

Then run:
```bash
cd ios && pod install
```

### `Info.plist` entries
```xml
<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>Camera is used to scan QR codes on tables and inventory items</string>

<!-- Notifications (requested after login, not on app open) -->
<!-- No Info.plist key needed — handled at runtime -->

<!-- Deep Linking -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>restaurantapp</string>
        </array>
    </dict>
</array>
```

### Firebase
- Place `GoogleService-Info.plist` in `ios/RestaurantApp/`
- In `AppDelegate.mm`:
  ```objc
  #import <Firebase.h>
  // In didFinishLaunchingWithOptions:
  [FIRApp configure];
  ```

---

## 4. Generate Release Keystore (Android)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release-key.keystore \
  -alias restaurant-key -keyalg RSA -keysize 2048 -validity 10000
```

Place it in `android/app/` directory.
