import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';
import SupportForm from '@/components/marketing/SupportForm';

export const metadata = {
  title: 'Contact — SOPTrackr',
  description: 'Get in touch with the SOPTrackr team. Sales: sales@soptrackr.com. Support: support@soptrackr.com.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary-50 to-white py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Contact</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-gray-900">
              Talk to a real person.
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              We&rsquo;re a small team — when you reach out, you reach the people building the product.
            </p>
          </div>
        </section>

        <section className="pb-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 gap-6">
            <a
              href="mailto:sales@soptrackr.com"
              className="block rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition p-6 bg-white"
            >
              <div className="w-10 h-10 rounded-md bg-primary-100 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Sales & general</h2>
              <p className="mt-1 text-gray-600">For demos, pricing, and partnership questions.</p>
              <p className="mt-3 text-primary-600 font-semibold">sales@soptrackr.com</p>
            </a>

            <a
              href="mailto:support@soptrackr.com?subject=Support%20request"
              className="block rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition p-6 bg-white"
            >
              <div className="w-10 h-10 rounded-md bg-primary-100 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636A9 9 0 105.636 18.364 9 9 0 0018.364 5.636zM12 8v4l2 2" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Customer support</h2>
              <p className="mt-1 text-gray-600">Existing customer? We&rsquo;ll get back to you fast.</p>
              <p className="mt-3 text-primary-600 font-semibold">support@soptrackr.com</p>
            </a>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Send us a support request</h2>
              <p className="mt-3 text-gray-600">
                Goes straight to <span className="font-semibold text-gray-900">support@soptrackr.com</span>. We typically reply within one business day.
              </p>
            </div>
            <SupportForm />
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-600">
              Looking for sales instead?{' '}
              <a href="/demo" className="text-primary-600 font-semibold hover:underline">
                Book a 15-minute demo →
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
