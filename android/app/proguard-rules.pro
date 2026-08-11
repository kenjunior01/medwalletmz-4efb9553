# ==========================================================================
# MedWallet MZ — ProGuard Rules
# Aplicado em builds release (minifyEnabled + shrinkResources)
# ==========================================================================

# ---- Capacitor Core ----
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**
-keepclassmembers class com.getcapacitor.JSObject {
    *** get*();
    void put*(***);
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    <init>(...);
}

# ---- Capacitor Plugins ----
-keep class com.getcapacitor.app.** { *; }
-keep class com.getcapacitor.camera.** { *; }
-keep class com.getcapacitor.geolocation.** { *; }
-keep class com.getcapacitor.pushnotifications.** { *; }
-keep class com.getcapacitor.splashscreen.** { *; }
-keep class com.getcapacitor.statusbar.** { *; }
-keep class com.getcapacitor.keyboard.** { *; }
-keep class com.getcapacitor.network.** { *; }
-keep class com.getcapacitor.share.** { *; }
-keep class com.getcapacitor.haptics.** { *; }
-keep class com.getcapacitor.screenorientation.** { *; }
-keep class com.getcapacitor.filesystem.** { *; }
-keep class com.getcapacitor.localnotifications.** { *; }

# ---- Supabase / PostgREST (okhttp + kotlinx) ----
-keep class io.github.jan.supabase.** { *; }
-keep class kotlin.jvm.** { *; }
-dontwarn kotlinx.serialization.**
-keepattributes *Annotation*, InnerClasses
-keep class com.supabase.** { *; }

# ---- OkHttp (usado pelo Capacitor e Supabase) ----
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ---- Firebase / FCM ----
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

# ---- Kotlin Coroutines ----
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# ---- Google Gson (serialização JSON) ----
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ---- WebView JavaScript Interface ----
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---- Modelos de dados (prevenir obfuscação) ----
-keep class mz.medwallet.app.** { *; }

# ---- AndroidX ----
-keep class androidx.** { *; }
-dontwarn androidx.**

# ---- Regras gerais ----
-keep class * {
    public protected *;
}
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
-keep class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
