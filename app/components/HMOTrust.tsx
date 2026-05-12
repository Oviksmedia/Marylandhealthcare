/* eslint-disable @next/next/no-img-element */
import styles from "./HMOTrust.module.css";

const hmoPartners = [
  { name: "UnitedHealthcare Global", logo: "/images/partners/unitedhealthcare-global.png" },
  { name: "MetLife", logo: "/images/partners/metlife.png" },
  { name: "Cigna", logo: "/images/partners/cigna.png" },
  { name: "Aetna", logo: "/images/partners/aetna.png" },
  { name: "Allianz Care", logo: "/images/partners/allianz-care.png" },
  { name: "Bupa", logo: "/images/partners/bupa.png" },
  { name: "Vitality", logo: "/images/partners/vitality.png" },
  { name: "Optimum Global", logo: "/images/partners/optimum-global.png" },
  { name: "IHMS", logo: "/images/partners/ihms.svg" },
  { name: "MSO Health", logo: "/images/partners/mso.svg" },
  { name: "AXA Mansard", logo: "/images/partners/axa-mansard.png" },
  { name: "Leadway Health", logo: "/images/partners/leadway-health.png" },
  { name: "Hygeia HMO", logo: "/images/partners/hygeia-hmo.png" },
  { name: "Avon HMO", logo: "/images/partners/avon-hmo.png" },
  { name: "Metro Health", logo: "/images/partners/metro-health.png" },
  { name: "Alleanza Health", logo: "/images/partners/alleanza-health.svg" },
  { name: "Anchor HMO", logo: "/images/partners/anchor-hmo.png" },
  { name: "Health Partners", logo: "/images/partners/health-partners.svg" },
  { name: "Novo Health", logo: "/images/partners/novo-health.png" },
  { name: "NNPC", logo: "/images/partners/nnpc.png" },
  { name: "Bastion Health", logo: "/images/partners/bastion-health.png" },
  { name: "HCI Healthcare", logo: "/images/partners/hci-healthcare.png" },
  { name: "Precious Health Care", logo: "/images/partners/precious-health-care.svg" },
  { name: "LifeWorth HMO", logo: "/images/partners/lifeworth-hmo.png" },
  { name: "Hallmark HMO", logo: "/images/partners/hallmark-hmo.png" },
  { name: "NEM Health Limited", logo: "/images/partners/nem-health.svg" },
  { name: "Tangerine Health", logo: "/images/partners/tangerine-health.png" },
  { name: "Total Health Trust", logo: "/images/partners/total-health-trust.png" },
];

const firstRow = hmoPartners.slice(0, 14);
const secondRow = hmoPartners.slice(14);

function LogoSet({ items }: { items: typeof hmoPartners }) {
  return (
    <div className={styles.logoSet}>
      {items.map((partner) => (
        <div className={styles.logoItem} key={partner.name}>
          <img className={styles.logoMark} src={partner.logo} alt={partner.name} />
        </div>
      ))}
    </div>
  );
}

export default function HMOTrust() {
  return (
    <section className={styles.section} id="partners">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>
            <span aria-hidden />
            <p>Trusted Partners</p>
          </div>
          <h2>Trusted by Over 28 Organizations &amp; Major HMOs</h2>
          <p>
            Our 44-year legacy is anchored in institutional trust. We are the preferred clinical
            partner for the region&apos;s top corporations, providing comprehensive health coverage
            seamlessly.
          </p>
        </div>

        <div aria-label="Maryland Healthcare HMO partners" className={styles.marqueeContainer}>
          <div aria-hidden className={styles.fadeLeft} />
          <div aria-hidden className={styles.fadeRight} />

          <div className={styles.motionRows}>
            <div className={`${styles.marqueeRow} ${styles.forward}`}>
              <LogoSet items={firstRow} />
              <LogoSet items={firstRow} />
            </div>

            <div className={`${styles.marqueeRow} ${styles.reverse}`}>
              <LogoSet items={secondRow} />
              <LogoSet items={secondRow} />
            </div>
          </div>

          <div className={styles.staticGrid}>
            {hmoPartners.map((partner) => (
              <div className={styles.logoItem} key={partner.name}>
                <img className={styles.logoMark} src={partner.logo} alt={partner.name} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
