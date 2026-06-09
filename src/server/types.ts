import type { Server } from "node:http";
import type { WebSocketServer } from "ws";
import type { PolicyEngine } from "../access-control/policy-engine";
import type { CrdtDocument } from "../crdt/document";
import type {
  User,
  UserId,
  UserRole,
  UserView,
  ViewOperation,
  ViewOperationEnvelope
} from "../types";
import type { DeleteImpactResult } from "./delete-impact";
import type { SqliteDocumentStore } from "./persistence";

export interface CollaborationServerOptions {
  crdt: CrdtDocument;
  users: User[];
  userAccounts?: UserAccount[];
  now?: () => number;
  documentStore?: Pick<SqliteDocumentStore, "save" | "saveUserAccount" | "deleteUserAccount">;
}

export interface CollaborationServer {
  httpServer: Server;
  wsServer: WebSocketServer;
  context: CollaborationContext;
}

export interface CollaborationContext {
  crdt: CrdtDocument;
  users: Map<UserId, User>;
  accounts: Map<string, UserAccount>;
  now: () => number;
  processedOperationIds: Set<string>;
  sessions: Map<string, SessionInfo>;
  policyVersion: number;
  policyEngine: PolicyEngine;
  accountStore?: Pick<SqliteDocumentStore, "saveUserAccount" | "deleteUserAccount">;
}

export interface SessionInfo {
  token: string;
  userId: UserId;
  createdAt: number;
  policyVersion: number;
}

export interface LoginRequestBody {
  username?: string;
  password?: string;
}

export interface LoginResponseBody {
  ok: true;
  token: string;
  user: PublicUser;
  policyVersion: number;
}

export interface PublicUser {
  id: UserId;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  createdAt: number;
}

export interface UpdateUserRequestBody {
  name?: string;
  role?: UserRole;
  department?: string;
}

export interface OperationRequestBody {
  userId?: UserId;
  operation?: ViewOperation;
  envelope?: ViewOperationEnvelope;
}

export type BatchViewOperationEnvelope = Omit<ViewOperationEnvelope, "userId"> & {
  userId?: UserId;
};

export interface BatchOperationRequestBody {
  userId?: UserId;
  operations?: BatchViewOperationEnvelope[];
}

export interface OperationResponseBody {
  ok: true;
  view: UserView;
  operationId?: string;
  deduplicated?: boolean;
  stateVector: string;
}

export interface RejectedOperationResult {
  id?: string;
  error: {
    name: string;
    code?: string;
    message: string;
  };
}

export interface BatchOperationResponseBody {
  ok: true;
  applied: string[];
  skipped: string[];
  rejected: RejectedOperationResult[];
  view: UserView;
  stateVector: string;
}

export interface DeleteImpactResponseBody extends DeleteImpactResult {
  ok: true;
}

export interface ErrorResponseBody {
  ok: false;
  error: {
    name: string;
    message: string;
  };
}

export interface RegisterRequestBody {
  username?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
}

export interface UserAccount {
  id: UserId;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  passwordHash: string;
  createdAt: number;
}

export type ClientMessage =
  | {
      type: "operation";
      operation: ViewOperation;
    }
  | {
      type: "operation";
      envelope: ViewOperationEnvelope;
    }
  | {
      type: "ping";
    };

export interface ChangeInfo {
  userId: string;
  userName: string;
  operationType: string;
  nodeTitle?: string;
  nodeId?: string;
}

export type ServerMessage =
  | {
      type: "view";
      view: UserView;
      stateVector: string;
      policyVersion: number;
      change?: ChangeInfo;
    }
  | {
      type: "operationApplied";
      view: UserView;
      operationId?: string;
      deduplicated?: boolean;
      stateVector: string;
      policyVersion: number;
      change?: ChangeInfo;
    }
  | {
      type: "error";
      error: {
        name: string;
        message: string;
      };
    }
  | {
      type: "pong";
    };
