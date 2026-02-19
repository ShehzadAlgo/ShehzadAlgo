// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "ShehzadAlgoKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "ShehzadAlgoProtocol", targets: ["ShehzadAlgoProtocol"]),
        .library(name: "ShehzadAlgoKit", targets: ["ShehzadAlgoKit"]),
        .library(name: "ShehzadAlgoChatUI", targets: ["ShehzadAlgoChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "ShehzadAlgoProtocol",
            path: "Sources/ShehzadAlgoProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ShehzadAlgoKit",
            dependencies: [
                "ShehzadAlgoProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/ShehzadAlgoKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ShehzadAlgoChatUI",
            dependencies: [
                "ShehzadAlgoKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/ShehzadAlgoChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "ShehzadAlgoKitTests",
            dependencies: ["ShehzadAlgoKit", "ShehzadAlgoChatUI"],
            path: "Tests/ShehzadAlgoKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
