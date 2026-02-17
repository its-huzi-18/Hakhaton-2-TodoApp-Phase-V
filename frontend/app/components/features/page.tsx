"use client";



export default function Features() {
  const features = [
    {
      title: "Task Management",
      description:
        "Create, edit, and delete tasks with ease. Add descriptions and track your progress effortlessly.",
      color: "sky",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      ),
    },
    {
      title: "User Authentication",
      description:
        "Secure login and registration with JWT tokens. Your data is protected with modern security practices.",
      color: "indigo",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      ),
    },
    {
      title: "Data Isolation",
      description:
        "Each user's tasks are completely isolated. Your personal data stays private and secure.",
      color: "violet",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      ),
    },
    {
      title: "Progress Tracking",
      description:
        "Mark tasks as complete and track your productivity with our intuitive progress indicators.",
      color: "sky",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      ),
    },
    {
      title: "Responsive Design",
      description:
        "Works perfectly on desktop, tablet, and mobile devices. Manage your tasks anywhere.",
      color: "indigo",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      ),
    },
    {
      title: "Modern UI",
      description:
        "Beautiful, clean interface with smooth animations and intuitive user experience.",
      color: "violet",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      ),
    },
  ];

  return (
    <>
    
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-24 sm:py-32 text-white">
      {/* Background glow effects */}
   
      <div className="absolute inset-0">
        <div className="absolute top-[-120px] right-[-120px] w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-120px] left-[-120px] w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"></div>
      </div>
 
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-indigo-400 tracking-wide uppercase">
            Features
          </h2>
          <p className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Everything you need to stay organized
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-300">
            Our task management app provides all the tools you need to boost your productivity and achieve your goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/10 transition-all shadow-lg"
            >
              <div
                className={`w-12 h-12 mb-4 mx-auto rounded-xl bg-${feature.color}-500/20 flex items-center justify-center`}
              >
                <svg
                  className={`w-6 h-6 text-${feature.color}-400`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section></>
  );
}
