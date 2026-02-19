// swift-tools-version: 6.2
// Package manifest for the ShehzadAlgo macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "ShehzadAlgo",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "ShehzadAlgoIPC", targets: ["ShehzadAlgoIPC"]),
        .library(name: "ShehzadAlgoDiscovery", targets: ["ShehzadAlgoDiscovery"]),
        .executable(name: "ShehzadAlgo", targets: ["ShehzadAlgo"]),
        .executable(name: "shehzadalgo-mac", targets: ["ShehzadAlgoMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/ShehzadAlgoKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "ShehzadAlgoIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ShehzadAlgoDiscovery",
            dependencies: [
                .product(name: "ShehzadAlgoKit", package: "ShehzadAlgoKit"),
            ],
            path: "Sources/ShehzadAlgoDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "ShehzadAlgo",
            dependencies: [
                "ShehzadAlgoIPC",
                "ShehzadAlgoDiscovery",
                .product(name: "ShehzadAlgoKit", package: "ShehzadAlgoKit"),
                .product(name: "ShehzadAlgoChatUI", package: "ShehzadAlgoKit"),
                .product(name: "ShehzadAlgoProtocol", package: "ShehzadAlgoKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/ShehzadAlgo.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "ShehzadAlgoMacCLI",
            dependencies: [
                "ShehzadAlgoDiscovery",
                .product(name: "ShehzadAlgoKit", package: "ShehzadAlgoKit"),
                .product(name: "ShehzadAlgoProtocol", package: "ShehzadAlgoKit"),
            ],
            path: "Sources/ShehzadAlgoMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "ShehzadAlgoIPCTests",
            dependencies: [
                "ShehzadAlgoIPC",
                "ShehzadAlgo",
                "ShehzadAlgoDiscovery",
                .product(name: "ShehzadAlgoProtocol", package: "ShehzadAlgoKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
