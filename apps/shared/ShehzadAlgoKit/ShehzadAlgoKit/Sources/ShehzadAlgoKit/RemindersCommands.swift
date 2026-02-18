import Foundation

public enum ShehzadAlgoRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum ShehzadAlgoReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct ShehzadAlgoRemindersListParams: Codable, Sendable, Equatable {
    public var status: ShehzadAlgoReminderStatusFilter?
    public var limit: Int?

    public init(status: ShehzadAlgoReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct ShehzadAlgoRemindersAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var dueISO: String?
    public var notes: String?
    public var listId: String?
    public var listName: String?

    public init(
        title: String,
        dueISO: String? = nil,
        notes: String? = nil,
        listId: String? = nil,
        listName: String? = nil)
    {
        self.title = title
        self.dueISO = dueISO
        self.notes = notes
        self.listId = listId
        self.listName = listName
    }
}

public struct ShehzadAlgoReminderPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var dueISO: String?
    public var completed: Bool
    public var listName: String?

    public init(
        identifier: String,
        title: String,
        dueISO: String? = nil,
        completed: Bool,
        listName: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.dueISO = dueISO
        self.completed = completed
        self.listName = listName
    }
}

public struct ShehzadAlgoRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [ShehzadAlgoReminderPayload]

    public init(reminders: [ShehzadAlgoReminderPayload]) {
        self.reminders = reminders
    }
}

public struct ShehzadAlgoRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: ShehzadAlgoReminderPayload

    public init(reminder: ShehzadAlgoReminderPayload) {
        self.reminder = reminder
    }
}
