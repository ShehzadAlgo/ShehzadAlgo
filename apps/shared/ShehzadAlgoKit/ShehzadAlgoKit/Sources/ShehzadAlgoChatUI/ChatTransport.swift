import Foundation

public enum ShehzadAlgoChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(ShehzadAlgoChatEventPayload)
    case agent(ShehzadAlgoAgentEventPayload)
    case seqGap
}

public protocol ShehzadAlgoChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> ShehzadAlgoChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [ShehzadAlgoChatAttachmentPayload]) async throws -> ShehzadAlgoChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> ShehzadAlgoChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<ShehzadAlgoChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension ShehzadAlgoChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "ShehzadAlgoChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> ShehzadAlgoChatSessionsListResponse {
        throw NSError(
            domain: "ShehzadAlgoChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
