import Link from 'next/link';
import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';

export const metadata = {
  title: 'Terms of Service — SOPTrackr',
  description: 'The terms governing your use of SOPTrackr.',
};

const EFFECTIVE_DATE = 'May 10, 2026';
const CONTACT_EMAIL = 'support@soptrackr.com';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary-50 to-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Legal</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Terms of Service</h1>
            <p className="mt-3 text-sm text-gray-500">Effective {EFFECTIVE_DATE}</p>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
            <P className="lead">
              These Terms of Service (&ldquo;Terms&rdquo;) are a legal agreement between you
              and SOPTrackr (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) governing your
              access to and use of soptrackr.com and the SOPTrackr application
              (collectively, the &ldquo;Service&rdquo;). By creating an account or using the
              Service you agree to these Terms.
            </P>

            <H2>1. Accounts and eligibility</H2>
            <P>
              You must be at least 18 years old and authorized to act on behalf of the
              automotive dealership you sign up for. You are responsible for keeping your login
              credentials secure and for all activity that occurs under your account.
              Administrators are responsible for managing their teammates&rsquo; access.
            </P>

            <H2>2. Organization model and tenant data</H2>
            <P>
              The Service is multi-tenant. Each dealership organization manages its own data and
              teammates. Data entered by your organization (&ldquo;Tenant Data&rdquo;) remains
              your property. You grant us a limited license to host, process, and transmit
              Tenant Data solely to provide the Service.
            </P>

            <H2>3. Acceptable use</H2>
            <P>You agree not to:</P>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Use the Service for unlawful, fraudulent, or abusive purposes</li>
              <li>Upload data you do not have the right to upload</li>
              <li>Reverse engineer, scrape, or attempt to bypass our tenant isolation</li>
              <li>Send unsolicited marketing or spam through the Service</li>
              <li>Resell or sublicense the Service without our written permission</li>
            </ul>

            <H2>4. Subscription, fees, and billing</H2>
            <P>
              The Service is offered on a subscription basis at a per-rooftop monthly rate
              communicated to you during signup or in your sales agreement. A one-time setup fee
              may apply unless waived (for example, with a 12-month commitment). Invoices are
              issued via QuickBooks and are payable on the terms stated. We may suspend or
              terminate access to organizations whose accounts become past due.
            </P>

            <H2>5. Cancellation and refunds</H2>
            <P>
              Cancellation requires <strong>thirty (30) days written notice</strong> sent to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
              . The subscription remains active and billable through the 30-day notice period,
              after which access ends. Annual subscriptions are non-refundable except as required
              by law. Setup fees are non-refundable once onboarding has begun. After cancellation
              we may retain your data for a reasonable period before deletion.
            </P>

            <H2>6. Service availability</H2>
            <P>
              We strive to make the Service highly available but provide no guaranteed uptime.
              We may modify, suspend, or discontinue features with notice when commercially
              reasonable. Planned maintenance will be announced when feasible.
            </P>

            <H2>7. Third-party services</H2>
            <P>
              The Service integrates with third parties including Clerk (authentication),
              Supabase (database), Vercel (hosting), Resend (email), and optionally GroupMe
              (notifications). Your use of those integrations is also governed by their terms
              and privacy policies. We are not responsible for third-party services.
            </P>

            <H2>8. Customer data and dealership obligations</H2>
            <P>
              Dealerships are responsible for the lawful collection and entry of end-customer
              data (such as customer names, phone, email, vehicle, and contact-log notes) into
              the Service. Dealerships must comply with applicable privacy laws and honor
              customer requests to access, correct, or delete data the dealership has entered.
            </P>

            <H2>9. Disclaimers</H2>
            <P>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT
              WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </P>

            <H2>10. Limitation of liability</H2>
            <P>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR AGGREGATE LIABILITY FOR ANY CLAIM
              ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNTS YOU PAID US
              FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM. WE WILL NOT BE
              LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES,
              INCLUDING LOST PROFITS OR LOST DATA.
            </P>

            <H2>11. Indemnification</H2>
            <P>
              You will indemnify and hold harmless SOPTrackr and its personnel from claims
              arising out of (a) your use of the Service in violation of these Terms, (b)
              Tenant Data you upload, or (c) your violation of applicable law.
            </P>

            <H2>12. Termination</H2>
            <P>
              Either party may terminate the agreement on <strong>thirty (30) days written
              notice</strong>. We may suspend or terminate access immediately, without notice,
              for material breach (including non-payment, prohibited use, or violation of
              applicable law). On termination, your right to access the Service ends; data may
              be retained per our Privacy Policy.
            </P>

            <H2>13. Changes to these Terms</H2>
            <P>
              We may update these Terms from time to time. When we do, we will update the
              effective date and, for material changes, provide notice to account
              administrators. Continued use of the Service after changes means you accept them.
            </P>

            <H2>14. Governing law</H2>
            <P>
              These Terms are governed by the laws of the Commonwealth of Pennsylvania (where
              SOPTrackr operates), without regard to conflict-of-law rules. Disputes will be
              resolved in the state or federal courts located in Berks County, Pennsylvania,
              and you consent to that jurisdiction.
            </P>

            <H2>15. Contact</H2>
            <P>
              Questions about these Terms?{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </P>

            <P className="text-xs text-gray-500 mt-12 pt-6 border-t border-gray-200">
              See also: <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
            </P>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-bold text-gray-900">{children}</h2>;
}
function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-3 text-gray-700 leading-relaxed ${className}`}>{children}</p>;
}
