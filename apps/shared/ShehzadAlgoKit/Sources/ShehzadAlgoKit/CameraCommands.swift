import Foundation

public enum ShehzadAlgoCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum ShehzadAlgoCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum ShehzadAlgoCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum ShehzadAlgoCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct ShehzadAlgoCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: ShehzadAlgoCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: ShehzadAlgoCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: ShehzadAlgoCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: ShehzadAlgoCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct ShehzadAlgoCameraClipParams: Codable, Sendable, Equatable {
    public var facing: ShehzadAlgoCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: ShehzadAlgoCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: ShehzadAlgoCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: ShehzadAlgoCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
