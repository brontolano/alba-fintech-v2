# Alba Fintech — ProGuard / R8 rules

# Keep all model classes (used by kotlinx-serialization reflection)
-keep class com.brontolano.albafintech.data.models.** { *; }

# Keep Kotlin serialization stuff
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-keepclassmembers class kotlin.Metadata { *; }

# Keep generic type information for ApiService
-keep,allowoptimization,allowobfuscation,allowshrinking interface com.brontolano.albafintech.data.remote.ApiService { *; }

# Retrofit + kotlinx-serialization: keep runtime type info
-keep,allowoptimization,allowobfuscation,allowshrinking class retrofit2.** { *; }
-keep,allowoptimization,allowobfuscation,allowshrinking class kotlinx.serialization.** { *; }
