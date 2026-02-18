import ShehzadAlgoProtocol
import Foundation
import Testing
@testable import ShehzadAlgo

@Suite(.serialized) struct VoiceWakeGlobalSettingsSyncTests {
    @Test func appliesVoiceWakeChangedEventToAppState() async {
        let previous = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(["before"])
        }

        let payload = ShehzadAlgoProtocol.AnyCodable(["triggers": ["shehzadalgo", "computer"]])
        let evt = EventFrame(
            type: "event",
            event: "voicewake.changed",
            payload: payload,
            seq: nil,
            stateversion: nil)

        await VoiceWakeGlobalSettingsSync.shared.handle(push: .event(evt))

        let updated = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }
        #expect(updated == ["shehzadalgo", "computer"])

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(previous)
        }
    }

    @Test func ignoresVoiceWakeChangedEventWithInvalidPayload() async {
        let previous = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(["before"])
        }

        let payload = ShehzadAlgoProtocol.AnyCodable(["unexpected": 123])
        let evt = EventFrame(
            type: "event",
            event: "voicewake.changed",
            payload: payload,
            seq: nil,
            stateversion: nil)

        await VoiceWakeGlobalSettingsSync.shared.handle(push: .event(evt))

        let updated = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }
        #expect(updated == ["before"])

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(previous)
        }
    }
}
