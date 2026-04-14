import React from 'react';
import { 
  MessageSquare, 
  CheckSquare, 
  FileText, 
  Video,
  Sparkles,
  Bot,
  FolderOpen,
  Users,
  StickyNote
} from 'lucide-react';

const NewFeatures: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: "Workspaces",
      description: "Organize your teams and projects in dedicated workspaces. Keep everything structured and accessible.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: MessageSquare,
      title: "Direct Messages",
      description: "Communicate instantly with team members through real-time messaging. Stay connected effortlessly.",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: CheckSquare,
      title: "Task Management",
      description: "Create, assign, and track tasks with ease. Keep your projects on schedule and organized.",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: StickyNote,
      title: "Notes",
      description: "Capture ideas and important information quickly. Your thoughts, organized and searchable.",
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      icon: FileText,
      title: "Documents",
      description: "Create and collaborate on documents in real-time. Write, edit, and share seamlessly.",
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      icon: Video,
      title: "Meetings",
      description: "Host video meetings with AI-powered transcription and summaries. Never miss important details.",
      color: "bg-red-100 text-red-600"
    },
    {
      icon: Sparkles,
      title: "AI Summaries",
      description: "Get instant AI-generated summaries of meetings and conversations. Save time and stay informed.",
      color: "bg-pink-100 text-pink-600"
    },
    {
      icon: Bot,
      title: "AI Assistant",
      description: "Your intelligent AI companion for drafting, brainstorming, and problem-solving. Work smarter.",
      color: "bg-teal-100 text-teal-600"
    },
    {
      icon: FolderOpen,
      title: "File Sharing",
      description: "Share files instantly with your team. Secure, fast, and accessible from anywhere.",
      color: "bg-orange-100 text-orange-600"
    }
  ];

  return (
    <section id="features"  className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 w-full">
      {/* Background Decor Elements */}
      <div className="pointer-events-none absolute -bottom-52 right-0 w-136 h-136 bg-gradient-to-br from-orange-300 to-lime-200 rounded-full opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -top-40 -left-40 w-120 h-120 bg-gradient-to-br from-orange-400 to-yellow-200 rounded-full opacity-40 blur-3xl" />

      <div id="new-features" className="relative z-10 py-12 sm:py-16 lg:py-24">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Everything You Need to Collaborate
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              All the tools your team needs in one powerful platform
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-16 lg:mt-20">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-transparent hover:-translate-y-1"
                >
                  {/* Icon */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl ${feature.color} flex items-center justify-center transition-all duration-300 mb-5 group-hover:shadow-lg`}>
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-gray-800">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover Accent */}
                  <div className="absolute top-0 left-0 w-1 h-0 bg-gradient-to-b from-orange-500 to-orange-600 rounded-l-2xl group-hover:h-full transition-all duration-300" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewFeatures;