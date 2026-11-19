import React from 'react';
import { ArrowRight, UploadCloud, Printer, Truck, CheckCircle2, ShieldCheck, Store, Users } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Upload & Specify',
    desc: 'Send documents with copies, paper size, and campus room.',
    icon: UploadCloud,
  },
  {
    num: '02',
    title: 'Print & Price',
    desc: 'Campus print shops review files, set price, and print.',
    icon: Printer,
  },
  {
    num: '03',
    title: 'Deliver & Pay',
    desc: 'Fellow students deliver to your room. Pay cash on delivery.',
    icon: Truck,
  },
];

const PIPELINE_STAGES = [
  'Pending Review',
  'Reviewed / Awaiting Payment',
  'Printing',
  'Ready for Delivery',
  'Out for Delivery',
  'Completed',
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white text-[#242424] flex flex-col">
      {/* Minimal Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/assets/aistudio/sorsu_0f1cec53.png"
              alt="Sorsogon State University Seal"
              className="w-9 h-9 rounded-full object-contain bg-white border border-[#E5E5E5] p-0.5"
            />
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#800000] whitespace-nowrap">
              Sorsu: <span className="text-[#242424]">PrintAhead</span>
            </span>
          </div>

          <nav className="hidden sm:flex items-center gap-6 text-xs font-semibold text-gray-600">
            <a href="#workflow" className="hover:text-[#800000] transition-colors whitespace-nowrap">
              Workflow
            </a>
          </nav>

          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="border-b border-[#E5E5E5] bg-[#F5F5F5]/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFF5F5] border border-[#FED7D7] text-[#800000] text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SorSU-Bulan Campus</span>
              </div>

              <h1
                className="font-extrabold tracking-tight text-[#242424] leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
              >
                Print ahead.{' '}
                <span className="text-[#800000]">Delivered to your room.</span>
              </h1>

              <p className="text-sm sm:text-base text-gray-600 max-w-xl leading-relaxed">
                Skip the print queue. Submit documents online, track real-time print status, and receive room delivery from SorSU student runners.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs whitespace-nowrap"
                >
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#workflow"
                  className="inline-flex items-center px-5 py-3 rounded-xl text-sm font-semibold text-[#242424] bg-white border border-[#E5E5E5] hover:border-[#800000] hover:text-[#800000] transition-colors whitespace-nowrap"
                >
                  How it works
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#800000]" />
                  <span>@sorsu.edu.ph verified access</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#800000]" />
                  <span>Cash on delivery</span>
                </span>
              </div>
            </div>

            {/* Clean Architectural Workflow Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Order Lifecycle
                    </div>
                    <div className="text-sm font-bold text-[#242424] mt-0.5">
                      6-Stage Campus Tracking
                    </div>
                  </div>
                  <img
                    src="/assets/aistudio/sorsu_0f1cec53.png"
                    alt="SorSU Emblem"
                    className="w-10 h-10 rounded-full object-contain border border-[#E5E5E5] p-0.5"
                  />
                </div>

                <ol className="space-y-2.5">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isHighlighted = idx === 3 || idx === 5;
                    return (
                      <li
                        key={stage}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs ${
                          isHighlighted
                            ? 'bg-[#FFF5F5] border-[#FED7D7] text-[#800000] font-bold'
                            : 'bg-[#F5F5F5]/60 border-[#E5E5E5] text-[#242424] font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center tabular-nums ${
                              isHighlighted
                                ? 'bg-[#800000] text-white'
                                : 'bg-white border border-[#E5E5E5] text-gray-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span>{stage}</span>
                        </div>
                        <span className="text-[11px] font-mono text-gray-400 tabular-nums">
                          {idx === 1 ? 'Priced' : idx === 5 ? 'Paid' : 'Email'}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="workflow" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-b border-[#E5E5E5]">
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#242424] tracking-tight">
              Three steps from upload to room
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WORKFLOW_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-3 hover:border-[#800000]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#800000] tabular-nums">
                      {step.num}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-[#FFF5F5] text-[#800000] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[#242424]">{step.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Campus Portals */}
        <section id="portals" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#242424] tracking-tight">
              Three focused campus portals
            </h2>
            <button
              type="button"
              onClick={onGetStarted}
              className="text-xs font-bold text-[#800000] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-6 bg-[#800000] text-white rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-100">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Students</span>
                </div>
                <h3 className="text-lg font-extrabold">Submit &amp; Deliver</h3>
                <p className="text-xs text-red-100 leading-relaxed">
                  Request document printing for your room or accept peer delivery jobs across campus in one workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={onGetStarted}
                className="self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white text-[#800000] hover:bg-[#FFF5F5] transition-colors"
              >
                <span>Student Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="md:col-span-3 bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#FFF5F5] text-[#800000] flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#242424]">Printing Shop</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Review attachments, set prices, print queued files, and release jobs for delivery.
              </p>
            </div>

            <div className="md:col-span-3 bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#FFF5F5] text-[#800000] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#242424]">Admin</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Manage SorSU user roles, printing stations, and campus-wide request status.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E5E5E5] bg-[#F5F5F5]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/sorsu_0f1cec53.png"
              alt="SorSU Crest"
              className="w-6 h-6 rounded-full object-contain"
            />
            <span className="font-semibold text-[#242424]">Sorsogon State University</span>
            <span>&middot;</span>
            <span>Bulan Campus</span>
          </div>
          <div className="flex items-center gap-4">
            <span>@sorsu.edu.ph accounts only</span>
            <button
              type="button"
              onClick={onGetStarted}
              className="font-bold text-[#800000] hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
