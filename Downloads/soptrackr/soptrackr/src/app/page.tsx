import Link from 'next/link';
import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Built by dealership pros, in production today
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Stop chasing special order parts.{' '}
                <span className="text-primary-600">Start tracking them.</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-xl">
                SOPTrackr gives your service drive end-to-end visibility on every special order part — from PO to install. No more advisor guessing, no more lost parts, no more angry customer callbacks.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 shadow-sm"
                >
                  Book a 15-min demo
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-gray-300 text-gray-900 font-semibold hover:bg-gray-50"
                >
                  See pricing
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                $599 / rooftop / month · $599 setup (waived with annual) · Cancel anytime
              </p>
            </div>

            {/* Pipeline mock */}
            <div className="relative">
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live SOP pipeline</p>
                    <p className="text-sm text-gray-900 font-medium">Performance Toyota — Today</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { part: 'Brake Caliper Assy', ro: 'RO-48211', status: 'In Transit', tone: 'bg-blue-100 text-blue-800', bin: '—' },
                    { part: 'Camry Headlight LH', ro: 'RO-48199', status: 'Received', tone: 'bg-amber-100 text-amber-900', bin: 'A1-05' },
                    { part: 'O2 Sensor (Bank 2)', ro: 'RO-48184', status: 'Binned · Ready', tone: 'bg-emerald-100 text-emerald-800', bin: 'C2-15' },
                    { part: 'Trans Filter Kit', ro: 'RO-48162', status: 'Installed', tone: 'bg-gray-200 text-gray-700', bin: '—' },
                  ].map((row) => (
                    <div key={row.ro} className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{row.part}</p>
                        <p className="text-xs text-gray-500">{row.ro} · Bin {row.bin}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${row.tone}`}>{row.status}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>4 of 23 open SOPs shown</span>
                  <span className="text-primary-600 font-medium">View all →</span>
                </div>
              </div>
              <div className="absolute -z-10 -top-4 -right-4 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl" />
              <div className="absolute -z-10 -bottom-8 -left-8 w-72 h-72 bg-primary-200/50 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Pain section */}
      <section className="bg-gray-950 text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold">If your fixed-ops team has ever said:</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              '"The part should be here by now — let me check with parts."',
              '"I never got the alert that it came in."',
              '"Customer\'s on hold asking about their special order."',
              '"We ordered it twice — nobody knew it was already on the shelf."',
              '"The bin sticker fell off, no idea where it went."',
              '"Tech\'s been waiting three days for that headlight."',
            ].map((quote) => (
              <div key={quote} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <p className="text-gray-300 italic">{quote}</p>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-xl text-gray-400 max-w-2xl mx-auto">
            Special order parts are the #1 source of CSI-killing delays in service. SOPTrackr fixes it.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">How it works</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">One workflow. Every SOP. Every rooftop.</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { n: '01', title: 'Parts Consultant creates SOP', body: 'Parts Consultant places special order from approved ASR from the Service Advisor.' },
              { n: '02', title: 'Parts orders & tracks', body: 'Parts department places order and enters info into SOPTrackr.' },
              { n: '03', title: 'Part marked arrived', body: 'Parts marks the part as arrived and notifications are sent to any pertinent personnel to start the outreach for scheduling.' },
              { n: '04', title: 'Outreach & follow-up', body: 'Outreach begins with date/time-stamped follow-up until the customer is scheduled. At day 30 unscheduled, a notification is sent to return the part.' },
            ].map((step) => (
              <div key={step.n} className="relative">
                <div className="text-5xl font-extrabold text-primary-100">{step.n}</div>
                <h3 className="mt-3 text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Features</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Built for the way dealerships actually work.</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Live status pipeline', body: 'Every SOP from Ordered → In Transit → Received → Binned → Installed. No more "where is it?" calls.' },
              { title: 'Bin location security', body: 'Role-based permissions on bin data. Parts personnel see and edit; advisors and techs see status only.' },
              { title: 'Multi-rooftop ready', body: 'Manage one store or fifty. Per-rooftop data isolation, group-level reporting, single sign-on for staff.' },
              { title: 'Audit trail by default', body: 'Every status change, every edit, every user — logged. Pull a full history on any SOP in one click.' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-md bg-primary-100 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Proven on the service drive</p>
          <blockquote className="text-2xl sm:text-3xl font-medium text-gray-900 max-w-3xl mx-auto leading-snug">
            &ldquo;We were chasing 30+ special orders a week with sticky notes and texts. SOPTrackr cut our customer follow-up calls in half — and we haven&rsquo;t lost a part since.&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">Fixed Operations Director</span> · Performance Toyota
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Ready to see SOPTrackr in your store?</h2>
          <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
            15 minutes. No slide deck. We&rsquo;ll show you the live workflow on real SOP data.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center px-6 py-3 rounded-md bg-white text-primary-700 font-semibold hover:bg-gray-50 shadow-sm"
            >
              Book a demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 rounded-md border border-primary-300 text-white font-semibold hover:bg-primary-800"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
