import { Navbar } from "../components/Navbar";

const SECTIONS = [
  {
    title: "1. Introduction",
    content: `Welcome to SkyNode. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains what information we collect when you use SkyNode, how we use it, and what rights you have.

SkyNode is a bachelor-project web application. It is not a commercial platform, and we do not sell or monetise your personal information.`,
  },
  {
    title: "2. What Data We Collect",
    subsections: [
      {
        title: "2.1 Account Information",
        content: "When you register for a SkyNode account, we collect:",
        bullets: [
          "Your email address (required for authentication and email confirmation)",
          "A password (stored in hashed form via Supabase Auth — we never see your plain-text password)",
          "An optional display name or profile information you choose to provide",
        ],
      },
      {
        title: "2.2 Travel Planning Data",
        content: "When you use SkyNode features, we store:",
        bullets: [
          "Trips you create, including destinations, dates, and itinerary details",
          "Flight searches and saved flight references",
          "Chat messages sent within shared trip contexts",
          "Community or shared trip memberships",
        ],
      },
      {
        title: "2.3 Usage and Technical Data",
        content: "We may collect limited technical data to operate the service, including:",
        bullets: [
          "Browser type and device information",
          "IP address (handled by Vercel and Supabase infrastructure)",
          "Interaction logs necessary for debugging and service reliability",
        ],
      },
    ],
  },
  {
    title: "3. How We Use Your Data",
    content: "We use your personal data for the following purposes:",
    bullets: [
      "To create and manage your SkyNode account",
      "To provide core features: flight search, trip planning, itinerary generation, and destination discovery",
      "To allow you to invite or join shared trips with other users",
      "To send you email confirmations or password reset messages via Supabase Auth",
      "To improve application reliability and fix technical issues",
    ],
    footer:
      "We do not use your data for advertising, profiling, or automated decision-making that has legal or significant effects on you.",
  },
  {
    title: "4. Third-Party Services",
    content:
      "SkyNode integrates with several external providers that may process data as part of delivering the service:",
    bullets: [
      "Supabase — authentication, database storage, and session management",
      "Vercel — frontend hosting and serverless API execution",
      "Google Gemini / Google AI — AI-generated travel suggestions and itinerary generation. When you request AI-generated itineraries or recommendations, relevant trip information may be sent to the AI provider to generate a response",
      "Travelpayouts and other flight data providers — for retrieving flight search results",
      "OpenSky Network — live aircraft position data (no personal data sent)",
      "Map, weather, destination, and image providers — for destination discovery features",
    ],
    footer:
      "Each third party processes data according to their own privacy policies. SkyNode only sends the minimum data necessary to each provider.",
  },
  {
    title: "5. Data Retention",
    content: `Your account data, trips, and itineraries are stored in Supabase PostgreSQL for as long as your account exists. If you delete your account through the Profile / Account settings page, we will make reasonable efforts to remove your personal data from our systems, except where retention is required for security, legal, or technical reasons. Some technical or infrastructure logs may be retained by hosting providers for a limited period per their own policies.`,
  },
  {
    title: "6. Security",
    content: "We implement reasonable security measures to protect your data:",
    bullets: [
      "Passwords are hashed and never stored in plain text",
      "Private API keys are stored server-side and never exposed to the browser",
      "Protected routes require a valid authenticated session before accessing personal data",
      "HTTPS is enforced for all traffic through Vercel",
    ],
    footer:
      "No system is completely secure. We cannot guarantee absolute security, and you use SkyNode at your own risk.",
  },
  {
    title: "7. Your Rights",
    content: "You have the following rights regarding your personal data:",
    bullets: [
      "Access — you can view the data stored in your profile at any time",
      "Correction — you can update your profile and account information",
      "Deletion — you can delete your account and associated data via Account Settings",
      "Portability — you may request a copy of your data by contacting the development team through your academic institution",
    ],
    footer:
      "To exercise these rights or ask questions, please reach out to the SkyNode development team through your academic institution at FERI, University of Maribor.",
  },
  {
    title: "8. Cookies",
    content: `SkyNode uses authentication and session cookies necessary for operation of the service. These are managed by Supabase Auth and stored in your browser. We do not use advertising or behavioural tracking cookies.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. If we make significant changes, we will update the effective date at the top of this document. Continued use of SkyNode after changes are posted constitutes your acceptance of the revised policy.`,
  },
  {
    title: "10. Contact",
    content: `If you have questions about this Privacy Policy, please contact the SkyNode development team through your academic institution at FERI, University of Maribor.`,
  },
];

type Subsection = {
  title: string;
  content: string;
  bullets: string[];
};

type Section = {
  title: string;
  content?: string;
  bullets?: string[];
  footer?: string;
  subsections?: Subsection[];
};

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-slate-700 text-sm leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PolicySection({ section }: { section: Section }) {
  return (
    <section className="border-b border-slate-100 pb-8 last:border-0">
      <h2 className="mb-3 text-lg font-bold text-slate-900">{section.title}</h2>

      {section.content && (
        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{section.content}</p>
      )}

      {section.bullets && <BulletList items={section.bullets} />}

      {section.subsections?.map((sub, i) => (
        <div key={i} className="mt-5">
          <h3 className="mb-1.5 text-sm font-semibold text-slate-800">{sub.title}</h3>
          <p className="text-sm leading-relaxed text-slate-700">{sub.content}</p>
          <BulletList items={sub.bullets} />
        </div>
      ))}

      {section.footer && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{section.footer}</p>
      )}
    </section>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-24 pb-16">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-600">
            Effective: June 2026 &nbsp;·&nbsp; SkyNode — AI-Assisted Travel Planning
          </p>
        </header>

        <div className="space-y-8">
          {SECTIONS.map((section, i) => (
            <PolicySection key={i} section={section as Section} />
          ))}
        </div>

        <footer className="mt-12 rounded-lg bg-slate-50 px-6 py-4 text-center text-xs text-slate-500">
          This policy applies to the SkyNode application deployed at{" "}
          <a
            href="https://sky-node-three.vercel.app/"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            sky-node-three.vercel.app
          </a>
          . For questions, contact the SkyNode team at FERI, University of Maribor.
        </footer>
      </main>
    </div>
  );
}

export default PrivacyPage;