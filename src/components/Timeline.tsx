import React from "react";
import { Timeline } from "@/components/ui/timeline";

interface TimelineItem {
  title: string;
  content: React.ReactNode;
}

export function WebflowXTimeline() {
  const data: TimelineItem[] = [
    {
      title: "2024",
      content: (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 md:text-base dark:text-neutral-100">
            WebflowX Launch
          </h3>
          <p className="mb-6 text-xs font-normal text-neutral-800 md:text-sm dark:text-neutral-200">
            Built and launched WebflowX full-stack productivity platform with chat, video calls, and task management.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="/hero.png"
              alt="placeholder"
              className="h-20 w-full rounded-lg object-cover shadow-md md:h-44 lg:h-60"
            />
            <img
              src="https://cdn.dribbble.com/userupload/36734258/file/original-eb966818009b0c0d431299d77e33e1a0.png?format=webp&resize=400x300&vertical=center   "
              alt="placeholder"
              className="h-20 w-full rounded-lg  shadow-md md:h-44 lg:h-60 object-contain"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Early 2023",
      content: (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 md:text-base dark:text-neutral-100">
            Core Features Development
          </h3>
          <p className="mb-6 text-xs font-normal text-neutral-800 md:text-sm dark:text-neutral-200">
            Developed modular components, AI-assisted meeting summaries, and integrated WebRTC video calls.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://cdn.dribbble.com/userupload/16257829/file/original-cd7d265456814a706e4ef4c43a69e3d9.png?resize=1024x768&vertical=center"
              alt="placeholder"
              className="h-20 w-full rounded-lg object-contain shadow-md md:h-44 lg:h-60"
            />
            <img
              src="https://cdn.dribbble.com/userupload/46089237/file/44f6e5f45e52b445367fd99adf9624b1.png?resize=1024x768&vertical=center"
              alt="placeholder"
              className="h-20 w-full rounded-lg object-cover shadow-md md:h-44 lg:h-60"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Changelog",
      content: (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 md:text-base dark:text-neutral-100">
            Updates & Releases
          </h3>
          <p className="mb-6 text-xs font-normal text-neutral-800 md:text-sm dark:text-neutral-200">
            Released new UI templates, improved performance, and added more AI-driven tools for collaboration.
          </p>
          <ul className="mb-6 list-disc pl-5 space-y-1 text-xs text-neutral-700 md:text-sm dark:text-neutral-300">
            <li>Card grid component</li>
            <li>Startup templates</li>
            <li>File upload improvements</li>
            <li>Video call integration</li>
          </ul>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://cdn.dribbble.com/userupload/46119827/file/cd655635e41e02594c12f0380c5b3e35.png?resize=1600x1200&vertical=center"
              alt="placeholder"
              className="h-20 w-full rounded-lg object-cover shadow-md md:h-44 lg:h-60"
            />
            <img
              src="https://cdn.dribbble.com/userupload/46110546/file/ac951bff6a45930c01d952deb7cd2d93.jpg?resize=1600x1200&vertical=center"
              alt="placeholder"
              className="h-20 w-full rounded-lg object-cover shadow-md md:h-44 lg:h-60"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="relative w-full overflow-hidden">
      <Timeline data={data}  />
    </div>
  );
}

export default WebflowXTimeline;
