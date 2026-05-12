import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "../../components/Footer";
import Nav from "../../components/Nav";
import { getInsightBySlug, insightsData } from "../insightsData";
import InsightDetailClient from "./InsightDetailClient";

type InsightPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return insightsData.map((insight) => ({
    slug: insight.slug,
  }));
}

export async function generateMetadata({ params }: InsightPageProps): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);

  if (!insight) {
    return {
      title: "Insight Not Found | Maryland Healthcare",
    };
  }

  return {
    title: `${insight.title} | Maryland Healthcare Insights`,
    description: insight.excerpt,
  };
}

export default async function InsightDetailPage({ params }: InsightPageProps) {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);

  if (!insight) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main>
        <InsightDetailClient insight={insight} />
      </main>
      <Footer />
    </>
  );
}
