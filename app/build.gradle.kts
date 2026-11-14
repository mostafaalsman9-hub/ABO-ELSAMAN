plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val appName = providers.gradleProperty("appName")
    .orElse("ABO ELSAMAN").get()

val websiteUrl = providers.gradleProperty("websiteUrl")
    .orElse("https://example.com").get()

val packageName = providers.gradleProperty("applicationId")
    .orElse("com.aboelsaman.webapp").get()

android {
    namespace = "
cd ~/ABO_ELSAMAN

cat > .github/workflows/build-apk.yml <<'EOF'
name: ABO ELSAMAN APK Builder

on:
  workflow_dispatch:
    inputs:
      app_name:
        description: App Name
        required: true
        default: My Website
      website_url:
        description: Website URL
        required: true
        default: https://example.com
      application_id:
        description: Android Package Name
        required: true
        default: com.aboelsaman.webapp

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.9'

      - name: Validate inputs
        env:
          APP_NAME: ${{ inputs.app_name }}
          WEBSITE_URL: ${{ inputs.website_url }}
          APP_ID: ${{ inputs.application_id }}
        run: |
          python3 - <<'PY'
          import os, re
          from urllib.parse import urlparse

          name = os.environ["APP_NAME"]
          url = os.environ["WEBSITE_URL"]
          app_id = os.environ["APP_ID"]

          parsed = urlparse(url)

          if not name.strip():
              raise SystemExit("App name cannot be empty")

          if parsed.scheme != "https" or not parsed.netloc:
              raise SystemExit("A valid HTTPS website URL is required")

          if not re.fullmatch(
              r"[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+",
              app_id
          ):
              raise SystemExit("Invalid Android application ID")

          print("Inputs validated successfully")
          PY

      - name: Build APK
        env:
          APP_NAME: ${{ inputs.app_name }}
          WEBSITE_URL: ${{ inputs.website_url }}
          APP_ID: ${{ inputs.application_id }}
        run: |
          gradle --no-daemon \
            -PappName="$APP_NAME" \
            -PwebsiteUrl="$WEBSITE_URL" \
            -PapplicationId="$APP_ID" \
            :app:assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: ABO-ELSAMAN-APK
          path: app/build/outputs/apk/debug/*.apk
          if-no-files-found: error
