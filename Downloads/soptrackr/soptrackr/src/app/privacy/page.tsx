import Link from 'next/link';
import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';

export const metadata = {
  title: 'Privacy Policy — SOPTrackr',
  description: 'How SOPTrackr collects, uses, and protects your dealership data.',
};

const EFFECTIVE_DATE = 'May 10, 2026';
const CONTACT_EMAIL = 'support@soptrackr.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary-50 to-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Legal</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Privacy Policy</h1>
            <p className="mt-3 text-sm text-gray-500">Effective {EFFECTIVE_DATE}</p>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
            <p className="lead text-gray-700">
              SOPTrackr (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) provides special-order parts tracking software for
              automotive dealerships. This Privacy Policy explains what information we collect,
              how we use it, and the choices you have. By using soptrackr.com or the SOPTrackr
              application, you agree to the practices described here.
            </p>

            <H2>Who this applies to</H2>
            <P>
              This policy covers visitors to soptrackr.com, dealership staff who use the
              SOPTrackr application, and end customers whose contact information is entered into
              the application by dealership staff in connection with their special-order parts.
            </P>

            <H2>Information we collect</H2>
            <H3>From dealership staff (account holders)</H3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Name, email, and role (provided during signup or via teammate invitation)</li>
              <li>Profile information from your authentication provider (Clerk), including profile image if you supply one</li>
              <li>Organization name, rooftop names, brand, and physical location (city/state)</li>
              <li>Optional notification settings such as your GroupMe bot identifier</li>
            </ul>

            <H3>From dealership customers (data entered by staff)</H3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Customer name, phone, email</li>
              <li>Vehicle information (year, make, model)</li>
              <li>Repair order number and SOP number</li>
              <li>Special-order part description, part number, status, and timestamps</li>
              <li>Notes and BDC contact-attempt logs entered by staff</li>
            </ul>
            <P>
              Dealerships are responsible for ensuring they have a lawful basis to enter this
              information into SOPTrackr and for honoring any customer requests to access,
              correct, or delete it.
            </P>

            <H3>From website visitors</H3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Information you submit through demo-request or support forms (name, dealership, email, phone, message)</li>
              <li>Basic technical data your browser sends (IP address, user-agent) and standard server logs</li>
            </ul>

            <H2>How we use information</H2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>To provide, operate, and improve the SOPTrackr application</li>
              <li>To authenticate users and isolate each dealership&rsquo;s data from other dealerships</li>
              <li>To send transactional emails (invitations, signup notifications, billing notices, support replies)</li>
              <li>To send GroupMe notifications to the group(s) you configure, on the events you enable</li>
              <li>To respond to your demo or support requests</li>
              <li>To detect and prevent abuse and to comply with applicable laws</li>
            </ul>

            <H2>How we share information</H2>
            <P>
              We do not sell your data. We share information only with the service providers we
              use to operate SOPTrackr, and only as needed:
            </P>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li><strong>Vercel</strong> &mdash; web application hosting</li>
              <li><strong>Supabase</strong> &mdash; PostgreSQL database hosting</li>
              <li><strong>Clerk</strong> &mdash; authentication and account management</li>
              <li><strong>Resend</strong> &mdash; transactional email delivery</li>
              <li><strong>GroupMe</strong> &mdash; only if you configure a bot ID; we post the messages you have configured to the group that bot serves</li>
            </ul>
            <P>
              We may disclose information when required by law, valid legal process, or to protect
              the rights, property, or safety of SOPTrackr, our users, or others.
            </P>

            <H2>Tenant isolation</H2>
            <P>
              SOPTrackr is multi-tenant. Each dealership&rsquo;s data is isolated at the database
              layer using PostgreSQL Row-Level Security. Authorized SOPTrackr platform operators
              may access tenant data only as required to provide support, debug issues, or
              fulfill legal obligations, and every such access is recorded in an audit log.
            </P>

            <H2>Data retention</H2>
            <P>
              We retain account, organization, and SOP data for as long as your subscription is
              active and for a reasonable period after cancellation in case you reactivate. You
              may request earlier deletion by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
              . Some records may be retained longer when required by law (e.g. tax records).
            </P>

            <H2>Security</H2>
            <P>
              We use industry-standard safeguards including encrypted connections (HTTPS), at-rest
              encryption provided by our database host, role-based access controls, and row-level
              security policies. No system is perfectly secure; you use SOPTrackr at your own risk.
            </P>

            <H2>Your choices</H2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>You can access, correct, or delete your own profile information from within the application or by emailing us</li>
              <li>Dealership administrators can remove teammates and revoke pending invitations</li>
              <li>Customers whose information was entered by a dealership should contact that dealership directly; we will assist the dealership in honoring valid requests</li>
              <li>You can opt out of non-essential communications at any time; transactional notifications about your account cannot be disabled while you remain a customer</li>
            </ul>

            <H2>Children</H2>
            <P>SOPTrackr is a business tool intended for adult dealership employees. We do not
            knowingly collect information from anyone under the age of 16.</P>

            <H2>Changes to this policy</H2>
            <P>
              We may update this Privacy Policy from time to time. When we do, we will update the
              effective date at the top of this page. For material changes, we will provide
              additional notice (such as an email to account administrators).
            </P>

            <H2>Contact us</H2>
            <P>
              Questions about this policy or your data? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </P>

            <P className="text-xs text-gray-500 mt-12 pt-6 border-t border-gray-200">
              See also: <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
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
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-4 text-base font-semibold text-gray-900">{children}</h3>;
}
function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-3 text-gray-700 leading-relaxed ${className}`}>{children}</p>;
}
