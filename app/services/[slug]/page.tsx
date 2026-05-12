import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "../../components/Footer";
import Nav from "../../components/Nav";
import { getRelatedServices, getServiceBySlug, servicesData } from "../servicesData";
import ServiceDetailClient from "./ServiceDetailClient";

type ServicePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return servicesData.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return {
      title: "Service Not Found | Maryland Healthcare",
    };
  }

  return {
    title: `${service.title} | Maryland Healthcare`,
    description: service.detail.heroTagline,
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main>
        <ServiceDetailClient relatedServices={getRelatedServices(service)} service={service} />
      </main>
      <Footer />
    </>
  );
}
