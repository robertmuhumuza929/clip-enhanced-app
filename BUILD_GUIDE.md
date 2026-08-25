# Clip 3.0 — Phone-only build plan

## Goal

You do not need to own a computer. Use a cloud development environment from your Android phone, then use Expo EAS to build the APK.

## 1. Create/log into an Expo account

Use the Expo website from your phone browser and create or sign in to an account.

## 2. Create a cloud development workspace

Use a browser-based development environment that provides a terminal and lets you upload the Clip ZIP.

Upload:

`Clip_Enhanced_Project_v3.zip`

Extract it in the cloud workspace.

## 3. Open the terminal

Run:

```bash
npm install
npm run doctor
```

Fix any dependency errors shown by Expo Doctor before building.

## 4. Install EAS CLI

```bash
npm install --global eas-cli
eas login
```

Log in using the same Expo account.

## 5. Build the Android APK

```bash
npm run build:apk
```

When asked about Android credentials/keystore, allow EAS to create them if you do not already have credentials.

## 6. Install the APK

When EAS finishes:

1. Open the build page on your Android phone.
2. Download the APK.
3. Open the downloaded APK.
4. Android may ask permission for the browser/file manager to install apps.
5. Allow it for that source.
6. Install Clip.

## 7. Test the important path

Use a short video first:

Import → Play → Trim → Filter → Text → Audio → Export → Gallery.

## 8. If the build fails

Do not randomly change packages.

Copy the final error from the cloud terminal and send it to ChatGPT. The error text is enough for us to identify the problem.

## 9. After the first successful APK

Keep this project as your master copy. Every time we improve the app, upload the new project or changed files, run:

```bash
npm install
npm run build:apk
```

## Important feature note

The project already has a native FFmpeg video engine. Advanced editing controls such as captions, speed changes, aspect-ratio conversion and quality presets need to be connected to that engine before they can all affect exported files. The current UI exposes the controls as the next stage rather than pretending those settings are already fully wired into every FFmpeg command.

## Recommended development order

1. Make APK build successfully.
2. Verify import/export.
3. Connect trim/split.
4. Connect aspect ratio and quality.
5. Connect speed.
6. Add undo/redo.
7. Add autosave.
8. Add captions.
9. Add audio waveform/voice-over.
10. Add creator presets.
