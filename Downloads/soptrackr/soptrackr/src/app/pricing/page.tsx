import Link from 'next/link';
import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';

export const metadata = {
  title: 'Pricing — SOPTrackr',
  description: 'Simple, per-rooftop pricing for SOPTrackr. $599 per rooftop per month. All features included. Setup fee waived with annual contract.',
};

const included = [
  'Unlimited users per rooftop',
  'Unlimited special order requests',
  'Live status pipeline (Ordered → Installed)',
  'Bin location security & permissions',
  'Audit trail on every change',
  'Multi-rooftop reporting',
  'Email support',
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary-50 to-white py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Pricing</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-gray-900">
              One price. Every feature. Per rooftop.
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              No tiered feature gating. No per-user fees. Pay for the rooftops you use.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl border-2 border-primary-200 shadow-xl overflow-hidden">
              <div className="bg-primary-600 text-white px-8 py-6">
                <p className="text-sm font-semibold uppercase tracking-wider opacity-90">SOPTrackr · Standard</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">$599</span>
                  <span className="text-primary-100">/ rooftop / month</span>
                </div>
                <p className="mt-2 text-primary-100">Billed monthly. Cancel anytime.</p>
                <p className="mt-1 text-primary-100 text-sm">+ $599 setup per rooftop &mdash; <strong>waived with a 12-month contract</strong></p>
              </div>

              <div className="px-8 py-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Everything included</h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 shadow-sm"
                  >
                    Book a demo
                  </Link>
                  <a
                    href="mailto:sales@soptrackr.com?subject=SOPTrackr%20pricing%20-%20multi-rooftop"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-gray-300 text-gray-900 font-semibold hover:bg-gray-50"
                  >
                    Talk to sales
                  </a>
                </div>
              </div>
            </div>

          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-10">Pricing FAQ</h2>
            <div className="space-y-6">
              {[
                { q: 'What counts as a "rooftop"?', a: 'A rooftop is a single dealership location — one physical service drive. If you have a Toyota store and a Honda store at the same address operating separately, that\'s two rooftops.' },
                { q: 'Are there per-user fees?', a: 'No. Add unlimited users per rooftop — advisors, parts, techs, managers, admins. All included.' },
                { q: 'Is there a setup fee or minimum contract?', a: 'A one-time $599 setup fee per rooftop covers onboarding, configuration, and team training. Sign a 12-month contract and we waive the setup fee entirely. Otherwise it\'s month-to-month, cancel anytime.' },
              ].map((item) => (
                <div key={item.q} className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900">{item.q}</h3>
                  <p className="mt-2 text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
