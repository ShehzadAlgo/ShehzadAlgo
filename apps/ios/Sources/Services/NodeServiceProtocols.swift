import CoreLocation
import Foundation
import ShehzadAlgoKit
import UIKit

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: ShehzadAlgoCameraSnapParams) async throws -> (format: String, base64: String, width: Int, height: Int)
    func clip(params: ShehzadAlgoCameraClipParams) async throws -> (format: String, base64: String, durationMs: Int, hasAudio: Bool)
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: ShehzadAlgoLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: ShehzadAlgoLocationGetParams,
        desiredAccuracy: ShehzadAlgoLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: ShehzadAlgoLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

protocol DeviceStatusServicing: Sendable {
    func status() async throws -> ShehzadAlgoDeviceStatusPayload
    func info() -> ShehzadAlgoDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: ShehzadAlgoPhotosLatestParams) async throws -> ShehzadAlgoPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: ShehzadAlgoContactsSearchParams) async throws -> ShehzadAlgoContactsSearchPayload
    func add(params: ShehzadAlgoContactsAddParams) async throws -> ShehzadAlgoContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: ShehzadAlgoCalendarEventsParams) async throws -> ShehzadAlgoCalendarEventsPayload
    func add(params: ShehzadAlgoCalendarAddParams) async throws -> ShehzadAlgoCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: ShehzadAlgoRemindersListParams) async throws -> ShehzadAlgoRemindersListPayload
    func add(params: ShehzadAlgoRemindersAddParams) async throws -> ShehzadAlgoRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: ShehzadAlgoMotionActivityParams) async throws -> ShehzadAlgoMotionActivityPayload
    func pedometer(params: ShehzadAlgoPedometerParams) async throws -> ShehzadAlgoPedometerPayload
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
