package ai.shehzadalgo.android.node

import android.os.Build
import ai.shehzadalgo.android.BuildConfig
import ai.shehzadalgo.android.SecurePrefs
import ai.shehzadalgo.android.gateway.GatewayClientInfo
import ai.shehzadalgo.android.gateway.GatewayConnectOptions
import ai.shehzadalgo.android.gateway.GatewayEndpoint
import ai.shehzadalgo.android.gateway.GatewayTlsParams
import ai.shehzadalgo.android.protocol.ShehzadAlgoCanvasA2UICommand
import ai.shehzadalgo.android.protocol.ShehzadAlgoCanvasCommand
import ai.shehzadalgo.android.protocol.ShehzadAlgoCameraCommand
import ai.shehzadalgo.android.protocol.ShehzadAlgoLocationCommand
import ai.shehzadalgo.android.protocol.ShehzadAlgoScreenCommand
import ai.shehzadalgo.android.protocol.ShehzadAlgoSmsCommand
import ai.shehzadalgo.android.protocol.ShehzadAlgoCapability
import ai.shehzadalgo.android.LocationMode
import ai.shehzadalgo.android.VoiceWakeMode

class ConnectionManager(
  private val prefs: SecurePrefs,
  private val cameraEnabled: () -> Boolean,
  private val locationMode: () -> LocationMode,
  private val voiceWakeMode: () -> VoiceWakeMode,
  private val smsAvailable: () -> Boolean,
  private val hasRecordAudioPermission: () -> Boolean,
  private val manualTls: () -> Boolean,
) {
  companion object {
    internal fun resolveTlsParamsForEndpoint(
      endpoint: GatewayEndpoint,
      storedFingerprint: String?,
      manualTlsEnabled: Boolean,
    ): GatewayTlsParams? {
      val stableId = endpoint.stableId
      val stored = storedFingerprint?.trim().takeIf { !it.isNullOrEmpty() }
      val isManual = stableId.startsWith("manual|")

      if (isManual) {
        if (!manualTlsEnabled) return null
        if (!stored.isNullOrBlank()) {
          return GatewayTlsParams(
            required = true,
            expectedFingerprint = stored,
            allowTOFU = false,
            stableId = stableId,
          )
        }
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      // Prefer stored pins. Never let discovery-provided TXT override a stored fingerprint.
      if (!stored.isNullOrBlank()) {
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = stored,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      val hinted = endpoint.tlsEnabled || !endpoint.tlsFingerprintSha256.isNullOrBlank()
      if (hinted) {
        // TXT is unauthenticated. Do not treat the advertised fingerprint as authoritative.
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      return null
    }
  }

  fun buildInvokeCommands(): List<String> =
    buildList {
      add(ShehzadAlgoCanvasCommand.Present.rawValue)
      add(ShehzadAlgoCanvasCommand.Hide.rawValue)
      add(ShehzadAlgoCanvasCommand.Navigate.rawValue)
      add(ShehzadAlgoCanvasCommand.Eval.rawValue)
      add(ShehzadAlgoCanvasCommand.Snapshot.rawValue)
      add(ShehzadAlgoCanvasA2UICommand.Push.rawValue)
      add(ShehzadAlgoCanvasA2UICommand.PushJSONL.rawValue)
      add(ShehzadAlgoCanvasA2UICommand.Reset.rawValue)
      add(ShehzadAlgoScreenCommand.Record.rawValue)
      if (cameraEnabled()) {
        add(ShehzadAlgoCameraCommand.Snap.rawValue)
        add(ShehzadAlgoCameraCommand.Clip.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(ShehzadAlgoLocationCommand.Get.rawValue)
      }
      if (smsAvailable()) {
        add(ShehzadAlgoSmsCommand.Send.rawValue)
      }
      if (BuildConfig.DEBUG) {
        add("debug.logs")
        add("debug.ed25519")
      }
      add("app.update")
    }

  fun buildCapabilities(): List<String> =
    buildList {
      add(ShehzadAlgoCapability.Canvas.rawValue)
      add(ShehzadAlgoCapability.Screen.rawValue)
      if (cameraEnabled()) add(ShehzadAlgoCapability.Camera.rawValue)
      if (smsAvailable()) add(ShehzadAlgoCapability.Sms.rawValue)
      if (voiceWakeMode() != VoiceWakeMode.Off && hasRecordAudioPermission()) {
        add(ShehzadAlgoCapability.VoiceWake.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(ShehzadAlgoCapability.Location.rawValue)
      }
    }

  fun resolvedVersionName(): String {
    val versionName = BuildConfig.VERSION_NAME.trim().ifEmpty { "dev" }
    return if (BuildConfig.DEBUG && !versionName.contains("dev", ignoreCase = true)) {
      "$versionName-dev"
    } else {
      versionName
    }
  }

  fun resolveModelIdentifier(): String? {
    return listOfNotNull(Build.MANUFACTURER, Build.MODEL)
      .joinToString(" ")
      .trim()
      .ifEmpty { null }
  }

  fun buildUserAgent(): String {
    val version = resolvedVersionName()
    val release = Build.VERSION.RELEASE?.trim().orEmpty()
    val releaseLabel = if (release.isEmpty()) "unknown" else release
    return "ShehzadAlgoAndroid/$version (Android $releaseLabel; SDK ${Build.VERSION.SDK_INT})"
  }

  fun buildClientInfo(clientId: String, clientMode: String): GatewayClientInfo {
    return GatewayClientInfo(
      id = clientId,
      displayName = prefs.displayName.value,
      version = resolvedVersionName(),
      platform = "android",
      mode = clientMode,
      instanceId = prefs.instanceId.value,
      deviceFamily = "Android",
      modelIdentifier = resolveModelIdentifier(),
    )
  }

  fun buildNodeConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "node",
      scopes = emptyList(),
      caps = buildCapabilities(),
      commands = buildInvokeCommands(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "shehzadalgo-android", clientMode = "node"),
      userAgent = buildUserAgent(),
    )
  }

  fun buildOperatorConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "operator",
      scopes = listOf("operator.read", "operator.write", "operator.talk.secrets"),
      caps = emptyList(),
      commands = emptyList(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "shehzadalgo-control-ui", clientMode = "ui"),
      userAgent = buildUserAgent(),
    )
  }

  fun resolveTlsParams(endpoint: GatewayEndpoint): GatewayTlsParams? {
    val stored = prefs.loadGatewayTlsFingerprint(endpoint.stableId)
    return resolveTlsParamsForEndpoint(endpoint, storedFingerprint = stored, manualTlsEnabled = manualTls())
  }
}
