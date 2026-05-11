import Link from 'next/link';
import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';

export const metadata = {
  title: 'About — SOPTrackr',
  description: 'SOPTrackr was built inside a working dealership service drive — by people who know what it costs when a special order goes missing.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary-50 to-white py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">About SOPTrackr</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-gray-900">
              Built by a Dealer for Dealers.
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              SOPTrackr started as an internal tool inside a working Toyota dealership. Our team got tired of sticky notes, lost parts, and customer callbacks. We built the system we wished existed — then realized every dealership needed it.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg prose-gray">
            <h2 className="text-2xl font-extrabold text-gray-900">What we know</h2>
            <ul className="mt-4 space-y-4 text-gray-700">
              <li>
                <strong className="text-gray-900">The average dealership is sitting on $50,000 in parts that haven&rsquo;t moved in a year.</strong>{' '}
                That&rsquo;s NADA&rsquo;s number — and a big chunk of it is special-order parts customers never came back to install, plus duplicates that got re-ordered because nobody knew the original was already on the shelf. Properly turned, that same $50K could generate{' '}
                <a href="https://www.cbtnews.com/the-cost-of-obsolescent-parts-to-a-dealer/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  $400,000 in annual sales
                </a>
                .
              </li>
              <li>
                <strong className="text-gray-900">Once 15%+ of your parts inventory has aged past 13 months, obsolescence starts eating real gross profit.</strong>{' '}
                NADA&rsquo;s benchmarks call for 8× annual parts turnover and a 90% first-time fill rate — meaning roughly 1 in 10 parts requests becomes a special order. Every untracked SOP pushes the wrong direction on both numbers.{' '}
                <a href="https://www.nada.org/media/2403/download" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  (NADA, Managing Your Parts Inventory)
                </a>
              </li>
              <li>
                <strong className="text-gray-900">Software for dealerships should feel like it was made by dealership people.</strong>{' '}
                Because ours was.
              </li>
            </ul>

            <h2 className="mt-12 text-2xl font-extrabold text-gray-900">Where we&rsquo;re going</h2>
            <p className="mt-4 text-gray-700">
              SOPTrackr is rolling out to single point and multi-rooftop groups across the country. Native DMS connectors (CDK, Reynolds, Tekion) and a mobile parts-runner app are next on the roadmap. Want to shape what we build? Get in touch.
            </p>

            <h2 className="mt-12 text-2xl font-extrabold text-gray-900">Meet the founder</h2>
            <div className="not-prose mt-6 grid sm:grid-cols-[160px_1fr] gap-6 items-start bg-gray-50 border border-gray-200 rounded-xl p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/jim-henne.jpg"
                alt="Jim Henne, Dealer Principal and founder of SOPTrackr"
                className="w-40 h-40 rounded-lg object-cover border border-gray-200 shadow-sm"
              />
              <div>
                <h3 className="text-xl font-bold text-gray-900">Jim Henne</h3>
                <p className="text-sm font-medium text-primary-700">Dealer Principal · Founder, SOPTrackr</p>
                <p className="mt-3 text-gray-700">
                  Jim has spent 20+ years in the car business — working his way up through Service Advisor, Service Manager, Parts Manager, Fixed Ops Director, and General Manager before becoming a Dealer Principal himself.
                </p>
                <p className="mt-3 text-gray-700">
                  At every dealer group along the way, the same problem kept showing up: special order parts. Everyone was chasing someone else for status updates and parts were falling through the cracks. He finally dedicated his time to building SOPTrackr and ran it inside his own store — and the results have far exceeded expectations.
                </p>
              </div>
            </div>

            <div className="not-prose mt-10 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center px-6 py-3 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 shadow-sm"
              >
                Book a demo
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 rounded-md border border-gray-300 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
