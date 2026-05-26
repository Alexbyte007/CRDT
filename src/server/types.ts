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

export interface CollaborationServerOptions {
  crdt: CrdtDocument;
  users: User[];
  now?: () => number;
}

export interface CollaborationServer {
  httpServer: Server;
  wsServer: WebSocketServer;
  context: CollaborationContext;
}

export interface CollaborationContext {
  crdt: CrdtDocument;
  users: Map<UserId, User>;
  now: () => number;
  processedOperationIds: Set<string>;
  sessions: Map<string, SessionInfo>;
  policyVersion: number;
  policyEngine: PolicyEngine;
}

export interface SessionInfo {
  token: string;
  userId: UserId;
  createdAt: number;
  policyVersion: number;
}

export interface LoginRequestBody {
  userId?: UserId;
}

export interface LoginResponseBody {
  ok: true;
  token: string;
  user: PublicUser;
  policyVersion: number;
}

export interface PublicUser {
  id: UserId;
  name: string;
  role: UserRole;
  department: string;
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

export interface ErrorResponseBody {
  ok: false;
  error: {
    name: string;
    message: string;
  };
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

export type ServerMessage =
  | {
      type: "view";
      view: UserView;
      stateVector: string;
    }
  | {
      type: "operationApplied";
      view: UserView;
      operationId?: string;
      deduplicated?: boolean;
      stateVector: string;
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
