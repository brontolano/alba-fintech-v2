pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode {
        FAIL_ON_PROJECT_REPOS
    }
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Alba Fintech"
include(":app")
