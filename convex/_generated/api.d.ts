/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as access from "../access.js";
import type * as attachments from "../attachments.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as calendar from "../calendar.js";
import type * as channels from "../channels.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as databases from "../databases.js";
import type * as dbTypes from "../dbTypes.js";
import type * as demoAvatars from "../demoAvatars.js";
import type * as demoClean from "../demoClean.js";
import type * as demoFix from "../demoFix.js";
import type * as demoReset from "../demoReset.js";
import type * as demoSeedData from "../demoSeedData.js";
import type * as demoSeedInfo from "../demoSeedInfo.js";
import type * as demoSeedPatch from "../demoSeedPatch.js";
import type * as docs from "../docs.js";
import type * as emailLayout from "../emailLayout.js";
import type * as emails from "../emails.js";
import type * as exports from "../exports.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as imports from "../imports.js";
import type * as integrations from "../integrations.js";
import type * as limits from "../limits.js";
import type * as liveblocks from "../liveblocks.js";
import type * as marks from "../marks.js";
import type * as meetings from "../meetings.js";
import type * as members from "../members.js";
import type * as messageHelpers from "../messageHelpers.js";
import type * as messages from "../messages.js";
import type * as newsletter from "../newsletter.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as permissions from "../permissions.js";
import type * as presence from "../presence.js";
import type * as push from "../push.js";
import type * as pushSend from "../pushSend.js";
import type * as retention from "../retention.js";
import type * as rateLimit from "../rateLimit.js";
import type * as reactions from "../reactions.js";
import type * as sent from "../sent.js";
import type * as sprints from "../sprints.js";
import type * as stripe from "../stripe.js";
import type * as taskComments from "../taskComments.js";
import type * as tasks from "../tasks.js";
import type * as threads from "../threads.js";
import type * as twoFactor from "../twoFactor.js";
import type * as typing from "../typing.js";
import type * as upload from "../upload.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as validate from "../validate.js";
import type * as webhookSend from "../webhookSend.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  access: typeof access;
  attachments: typeof attachments;
  audit: typeof audit;
  auth: typeof auth;
  billing: typeof billing;
  calendar: typeof calendar;
  channels: typeof channels;
  conversations: typeof conversations;
  crons: typeof crons;
  databases: typeof databases;
  dbTypes: typeof dbTypes;
  demoAvatars: typeof demoAvatars;
  demoClean: typeof demoClean;
  demoFix: typeof demoFix;
  demoReset: typeof demoReset;
  demoSeedData: typeof demoSeedData;
  demoSeedInfo: typeof demoSeedInfo;
  demoSeedPatch: typeof demoSeedPatch;
  docs: typeof docs;
  emailLayout: typeof emailLayout;
  emails: typeof emails;
  exports: typeof exports;
  files: typeof files;
  http: typeof http;
  imports: typeof imports;
  integrations: typeof integrations;
  limits: typeof limits;
  liveblocks: typeof liveblocks;
  marks: typeof marks;
  meetings: typeof meetings;
  members: typeof members;
  messageHelpers: typeof messageHelpers;
  messages: typeof messages;
  newsletter: typeof newsletter;
  notes: typeof notes;
  notifications: typeof notifications;
  permissions: typeof permissions;
  presence: typeof presence;
  push: typeof push;
  pushSend: typeof pushSend;
  rateLimit: typeof rateLimit;
  retention: typeof retention;
  reactions: typeof reactions;
  sent: typeof sent;
  sprints: typeof sprints;
  stripe: typeof stripe;
  taskComments: typeof taskComments;
  tasks: typeof tasks;
  threads: typeof threads;
  twoFactor: typeof twoFactor;
  typing: typeof typing;
  upload: typeof upload;
  usage: typeof usage;
  users: typeof users;
  validate: typeof validate;
  webhookSend: typeof webhookSend;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
