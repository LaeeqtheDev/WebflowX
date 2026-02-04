import React from "react";
import { Timeline } from "@/components/ui/timeline";

export function WebflowXTimeline() {
  const data = [
    {
      title: "Mid 2024",
      content: (
        <div>
          <h3 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Idea, doubt, and first prototype
          </h3>

          <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
            WebflowX began as an attempt to unify chat, tasks, and collaboration
            into one focused workspace. The first versions were rough, slow, and
            frequently rewritten — but they validated the core idea.
          </p>

          <ul className="mb-5 list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
            <li>Basic routing and authentication</li>
            <li>Unstable UI experiments</li>
            <li>Multiple folder structure rewrites</li>
          </ul>

          <div className="grid grid-cols-2 gap-4">
            <img
              src="/early.png"
              alt="early wireframe"
              className="h-full w-full rounded-md object-cover bg-neutral-100 dark:bg-neutral-900"
            />
            <img
              src="/early-dashboard.png"
              alt="early dashboard"
              className="h-full w-full rounded-md object-cover bg-neutral-100 dark:bg-neutral-900"
            />
          </div>
        </div>
      ),
    },

    {
      title: "Late 2024",
      content: (
        <div>
          <h3 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Core architecture & painful refactors
          </h3>

          <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
            As complexity increased, the focus shifted to architecture. Several
            early decisions were rolled back to improve scalability, real-time
            sync, and maintainability.
          </p>

          <ul className="mb-5 list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
            <li>Socket.IO integration for live updates</li>
            <li>Early WebRTC experiments (many failed)</li>
            <li>Reworked data models and permissions</li>
          </ul>

          <div className="grid grid-cols-2 gap-4">
            <img
              src="timeline2.png"
              alt="architecture iteration"
              className="h-full w-full rounded-md object-cover"
            />
            
          </div>
        </div>
      ),
    },

    {
      title: "Early 2025",
      content: (
        <div>
          <h3 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Stabilization & feature lock
          </h3>

          <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
            Feature development slowed intentionally. The focus moved to
            stability, performance, and creating a consistent experience across
            the platform.
          </p>

          <ul className="mb-5 list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
            <li>Task system finalized</li>
            <li>Chat & video call flow stabilized</li>
            <li>AI summaries integrated cautiously</li>
          </ul>

          <div className="grid grid-cols-2 gap-4">
            <img
              src="/task.png"
              alt="final hero"
              className="h-full w-full rounded-md object-cover"
            />
            <img
              src="final.png"
              alt="final UI"
              className="h-full w-full rounded-md object-cover"
            />
          </div>
        </div>
      ),
    },

  ];

  return (
    <div className="relative w-full overflow-hidden">
      <Timeline data={data} />
    </div>
  );
}

export default WebflowXTimeline;
