import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-shehzadalgo writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.shehzadalgo.mac"
let gatewayLaunchdLabel = "ai.shehzadalgo.gateway"
let onboardingVersionKey = "shehzadalgo.onboardingVersion"
let onboardingSeenKey = "shehzadalgo.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "shehzadalgo.pauseEnabled"
let iconAnimationsEnabledKey = "shehzadalgo.iconAnimationsEnabled"
let swabbleEnabledKey = "shehzadalgo.swabbleEnabled"
let swabbleTriggersKey = "shehzadalgo.swabbleTriggers"
let voiceWakeTriggerChimeKey = "shehzadalgo.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "shehzadalgo.voiceWakeSendChime"
let showDockIconKey = "shehzadalgo.showDockIcon"
let defaultVoiceWakeTriggers = ["shehzadalgo"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "shehzadalgo.voiceWakeMicID"
let voiceWakeMicNameKey = "shehzadalgo.voiceWakeMicName"
let voiceWakeLocaleKey = "shehzadalgo.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "shehzadalgo.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "shehzadalgo.voicePushToTalkEnabled"
let talkEnabledKey = "shehzadalgo.talkEnabled"
let iconOverrideKey = "shehzadalgo.iconOverride"
let connectionModeKey = "shehzadalgo.connectionMode"
let remoteTargetKey = "shehzadalgo.remoteTarget"
let remoteIdentityKey = "shehzadalgo.remoteIdentity"
let remoteProjectRootKey = "shehzadalgo.remoteProjectRoot"
let remoteCliPathKey = "shehzadalgo.remoteCliPath"
let canvasEnabledKey = "shehzadalgo.canvasEnabled"
let cameraEnabledKey = "shehzadalgo.cameraEnabled"
let systemRunPolicyKey = "shehzadalgo.systemRunPolicy"
let systemRunAllowlistKey = "shehzadalgo.systemRunAllowlist"
let systemRunEnabledKey = "shehzadalgo.systemRunEnabled"
let locationModeKey = "shehzadalgo.locationMode"
let locationPreciseKey = "shehzadalgo.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "shehzadalgo.peekabooBridgeEnabled"
let deepLinkKeyKey = "shehzadalgo.deepLinkKey"
let modelCatalogPathKey = "shehzadalgo.modelCatalogPath"
let modelCatalogReloadKey = "shehzadalgo.modelCatalogReload"
let cliInstallPromptedVersionKey = "shehzadalgo.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "shehzadalgo.heartbeatsEnabled"
let debugPaneEnabledKey = "shehzadalgo.debugPaneEnabled"
let debugFileLogEnabledKey = "shehzadalgo.debug.fileLogEnabled"
let appLogLevelKey = "shehzadalgo.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
