plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

val appName = providers.gradleProperty("appName").orElse("ABO ELSAMAN").get()
val websiteUrl = providers.gradleProperty("websiteUrl").orElse("https://example.com").get()
val packageName = providers.gradleProperty("applicationId").orElse("com.aboelsaman.webapp").get()

android {
    namespace = "com.aboelsaman.webapp"
    compileSdk = 35

    defaultConfig {
        applicationId = packageName
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        resValue("string", "app_name", appName)
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            buildConfigField("String", "WEBSITE_URL", "\"${websiteUrl}\"")
        }
    }


    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:35.2.0"))
    implementation("com.google.firebase:firebase-auth")
}
