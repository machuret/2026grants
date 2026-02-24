import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { grantPublicUrl } from "@/lib/slugify";
import { ExternalLink, Calendar, DollarSign, Globe, MapPin, Briefcase, Clock, CheckCircle } from "lucide-react";

interface Props {
  params: Promise<{ country: string; state: string; industry: string; slug: string }>;
}

async function getGrant(slug: string) {
  const { data } = await db
    .from("PublicGrant")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const grant = await getGrant(slug);
  if (!grant) return { title: "Grant Not Found" };

  return {
    title: grant.seoTitle || `${grant.name} — GrantsHub`,
    description: grant.seoDescription || grant.description || `Learn about the ${grant.name} grant opportunity.`,
    keywords: grant.seoKeywords || undefined,
    openGraph: {
      title: grant.seoTitle || grant.name,
      description: grant.seoDescription || grant.description || "",
      type: "article",
    },
    alternates: {
      canonical: grantPublicUrl(grant) ?? undefined,
    },
  };
}

export default async function GrantDetailPage({ params }: Props) {
  const { slug, country, state, industry } = await params;
  const grant = await getGrant(slug);
  if (!grant) notFound();

  const breadcrumbs = [
    { label: "Grants", href: "/grants-directory" },
    { label: grant.country ?? country, href: `/${country}` },
    ...(state ? [{ label: grant.state ?? state, href: `/${country}/${state}` }] : []),
    ...(industry ? [{ label: grant.industry ?? industry, href: `/${country}/${state}/${industry}` }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
        {breadcrumbs.map((b, i) => (
          <span key={b.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <a href={b.href} className="hover:text-brand-600 capitalize">{b.label}</a>
          </span>
        ))}
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium truncate">{grant.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{grant.name}</h1>
            {grant.founder && <p className="mt-2 text-lg text-gray-500">{grant.founder}</p>}
          </div>
          {grant.url && (
            <a href={grant.url} target="_blank" rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
              Apply Now <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Key stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {grant.amount && (
            <div className="rounded-xl bg-green-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">
                <DollarSign className="h-3.5 w-3.5" /> Funding
              </div>
              <p className="text-sm font-bold text-green-800">{grant.amount}</p>
            </div>
          )}
          {grant.deadlineDate && (
            <div className="rounded-xl bg-orange-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-600 mb-1">
                <Calendar className="h-3.5 w-3.5" /> Deadline
              </div>
              <p className="text-sm font-bold text-orange-800">{grant.deadlineDate}</p>
            </div>
          )}
          {grant.country && (
            <div className="rounded-xl bg-blue-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">
                <Globe className="h-3.5 w-3.5" /> Country
              </div>
              <p className="text-sm font-bold text-blue-800">{grant.country}</p>
            </div>
          )}
          {grant.industry && (
            <div className="rounded-xl bg-purple-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">
                <Briefcase className="h-3.5 w-3.5" /> Industry
              </div>
              <p className="text-sm font-bold text-purple-800">{grant.industry}</p>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {grant.description && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About this Grant</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{grant.description}</p>
            </section>
          )}
          {grant.eligibility && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Eligibility</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{grant.eligibility}</p>
            </section>
          )}
          {grant.requirements && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Requirements</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{grant.requirements}</p>
            </section>
          )}
          {grant.howToApply && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">How to Apply</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{grant.howToApply}</p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Grant Details</h3>
            <dl className="space-y-3 text-sm">
              {grant.geographicScope && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    <Globe className="h-3 w-3" /> Geographic Scope
                  </dt>
                  <dd className="text-gray-700">{grant.geographicScope}</dd>
                </div>
              )}
              {grant.state && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    <MapPin className="h-3 w-3" /> State / Region
                  </dt>
                  <dd className="text-gray-700">{grant.state}</dd>
                </div>
              )}
              {grant.projectDuration && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    <Clock className="h-3 w-3" /> Project Duration
                  </dt>
                  <dd className="text-gray-700">{grant.projectDuration}</dd>
                </div>
              )}
              {grant.contactInfo && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    Contact
                  </dt>
                  <dd className="text-gray-700 whitespace-pre-wrap">{grant.contactInfo}</dd>
                </div>
              )}
            </dl>
          </div>

          {grant.url && (
            <a href={grant.url} target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
              Apply for this Grant <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-brand-600" />
              <p className="text-sm font-semibold text-brand-800">Track this grant</p>
            </div>
            <p className="text-xs text-brand-600 mb-3">Sign in to add this grant to your pipeline and get AI-powered application assistance.</p>
            <a href="/login" className="block w-full rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-700">
              Sign in to GrantsHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
