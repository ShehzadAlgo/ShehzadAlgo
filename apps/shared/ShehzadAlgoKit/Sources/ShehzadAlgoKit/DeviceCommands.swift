import Foundation

public enum ShehzadAlgoDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum ShehzadAlgoBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum ShehzadAlgoThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum ShehzadAlgoNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum ShehzadAlgoNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct ShehzadAlgoBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: ShehzadAlgoBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: ShehzadAlgoBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct ShehzadAlgoThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: ShehzadAlgoThermalState

    public init(state: ShehzadAlgoThermalState) {
        self.state = state
    }
}

public struct ShehzadAlgoStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct ShehzadAlgoNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: ShehzadAlgoNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [ShehzadAlgoNetworkInterfaceType]

    public init(
        status: ShehzadAlgoNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [ShehzadAlgoNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct ShehzadAlgoDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: ShehzadAlgoBatteryStatusPayload
    public var thermal: ShehzadAlgoThermalStatusPayload
    public var storage: ShehzadAlgoStorageStatusPayload
    public var network: ShehzadAlgoNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: ShehzadAlgoBatteryStatusPayload,
        thermal: ShehzadAlgoThermalStatusPayload,
        storage: ShehzadAlgoStorageStatusPayload,
        network: ShehzadAlgoNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct ShehzadAlgoDeviceInfoPayload: Codable, Sendable, Equatable {
    public var deviceName: String
    public var modelIdentifier: String
    public var systemName: String
    public var systemVersion: String
    public var appVersion: String
    public var appBuild: String
    public var locale: String

    public init(
        deviceName: String,
        modelIdentifier: String,
        systemName: String,
        systemVersion: String,
        appVersion: String,
        appBuild: String,
        locale: String)
    {
        self.deviceName = deviceName
        self.modelIdentifier = modelIdentifier
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.locale = locale
    }
}
