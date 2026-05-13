export interface ServiceDetail {
  heroTagline: string;
  opening: string;
  pullQuote: string;
  body: string[];
  offers: string[];
  idealSummary: string;
}

export interface Service {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  idealFor: string;
  ctaLabel: string;
  slug: string;
  image: string;
  imageAlt: string;
  detail: ServiceDetail;
  relatedSlugs: string[];
}

export const servicesData: Service[] = [
  {
    number: "01",
    eyebrow: "Remote Care",
    title: "Telemedicine & E-Health",
    description:
      "For the patient who cannot lose half a day to traffic, telemedicine turns access into relief. Maryland's doctors can review symptoms, interpret results, manage prescriptions, and guide next steps through a secure consultation that still feels personal.",
    idealFor:
      "Busy professionals, parents managing after-hours questions, patients needing lab review, prescription support, follow-ups, or private counseling without the commute.",
    ctaLabel: "Book Telehealth Visit",
    slug: "telemedicine",
    image: "/services/telemedicine.png",
    imageAlt:
      "A candid over-the-shoulder view of a Nigerian mother in a focused telemedicine consultation with a doctor on a tablet.",
    relatedSlugs: ["general-practice", "diagnostic-laboratory", "mental-health"],
    detail: {
      heroTagline: "Your doctor is always within reach, no commute required.",
      opening:
        "There are days when the right care should not require three hours in traffic or a waiting room full of uncertainty. Telemedicine gives you a direct line to clinical judgment, especially when the question is urgent enough to matter but not always urgent enough for a hospital visit.",
      pullQuote:
        "The screen changes the distance; it should never dilute the intimacy of being heard by a doctor who knows what to ask.",
      body: [
        "Maryland Healthcare's e-health service is designed for the real texture of life in Port Harcourt: work schedules that do not bend easily, children who develop fevers late at night, chronic conditions that need steady follow-up, and laboratory results that should be explained by a physician rather than guessed at alone.",
        "A virtual consultation is not a lesser version of care. It is the right front door for many clinical needs: a symptom review, medication guidance, mental health support, follow-up after treatment, or a decision about whether an in-person examination is necessary. The value is not simply convenience; it is continuity without interruption.",
        "When an in-person visit is needed, the consultation helps you arrive better prepared. Your history has already been heard, your immediate risk has been assessed, and your next step is clearer. That is modern access in service of old-fashioned attentiveness.",
      ],
      offers: [
        "Virtual doctor consultations by video or voice",
        "Prescription management and refills",
        "Lab result interpretation and review",
        "Routine follow-up appointments",
        "Mental health support sessions",
        "General health triage and advice",
      ],
      idealSummary:
        "Best for patients who need timely medical guidance, continuity of care, or a trusted first opinion before deciding whether to come into the hospital.",
    },
  },
  {
    number: "02",
    eyebrow: "Primary Care",
    title: "General Practice",
    description:
      "General Practice is the front door to Maryland's full clinical system. It is where one physician can see today's symptoms in the context of your history, your family, your medications, and the patterns that only become visible over years of care.",
    idealFor:
      "Annual exams, chronic disease management, first consultations, admissions, surgical referrals, and families who want one steady medical home.",
    ctaLabel: "Schedule Annual Exam",
    slug: "general-practice",
    image: "/services/general-practice.png",
    imageAlt:
      "A professional and empathetic Nigerian doctor engaged in a thoughtful consultation with a patient in a modern clinic.",
    relatedSlugs: ["internal-medicine", "diagnostic-laboratory", "pediatrics"],
    detail: {
      heroTagline: "The cornerstone of a health journey that lasts a lifetime.",
      opening:
        "Primary care is where medicine becomes relationship. At Maryland Healthcare, a consultation is not treated as an isolated event; it is part of a longer record of how you live, recover, age, and respond to treatment.",
      pullQuote:
        "Unhurried primary care is the difference between treating a symptom and understanding the person carrying it.",
      body: [
        "For 44 years, Maryland has cared for families across Port Harcourt through ordinary checkups, sudden illnesses, admissions, surgeries, and the steady management of conditions like hypertension and diabetes. That institutional memory matters because good diagnosis often begins with context.",
        "Our general practitioners coordinate the first layer of care, deciding when reassurance is enough, when testing is required, when admission is appropriate, and when a specialist should join the plan. It is the department that turns scattered concerns into a coherent clinical direction.",
        "The result is medicine that feels less fragmented. You do not have to reintroduce your history at every turn. Your care team understands what has changed, what has stayed the same, and what deserves attention now.",
      ],
      offers: [
        "General and specialized surgeries",
        "In-patient admission and ward care",
        "Chronic disease management for hypertension and diabetes",
        "Emergency trauma and injury treatment",
        "Infectious disease care including malaria and typhoid",
        "Pediatric and geriatric consultations",
      ],
      idealSummary:
        "Best for patients seeking a trusted first point of care, long-term medical oversight, or coordinated access to the wider hospital team.",
    },
  },
  {
    number: "03",
    eyebrow: "Family Beginnings",
    title: "Maternity & Childbirth",
    description:
      "Maternity care should feel both clinically secure and deeply personal. From antenatal visits to delivery and postnatal support, Maryland surrounds mother and baby with steady hands, quiet privacy, and the confidence of a team that understands the weight of this moment.",
    idealFor:
      "Expectant mothers seeking antenatal care, safe delivery planning, caesarean capability, newborn support, family planning, and high-risk pregnancy management.",
    ctaLabel: "Explore Maternity Plans",
    slug: "maternity",
    image: "/services/maternity.png",
    imageAlt:
      "A professional and premium maternity suite at Maryland Healthcare, showing a Nigerian mother and newborn in a clean, modern clinical environment.",
    relatedSlugs: ["obstetrics-gynecology", "pediatrics", "diagnostic-laboratory"],
    detail: {
      heroTagline:
        "Where your family's story begins, with care as personal as this moment deserves.",
      opening:
        "Pregnancy asks a family to trust a hospital with its most vulnerable chapter. Maryland's maternity care is built to make that trust feel earned from the first antenatal conversation through delivery, recovery, and the baby's earliest days.",
      pullQuote:
        "The best maternity care follows the family from first trimester to first steps, never treating birth as a single day on the calendar.",
      body: [
        "Our maternity unit combines experienced midwives, obstetric oversight, and facilities prepared for both normal and caesarean deliveries. The clinical standard is safety, but the emotional standard is dignity: mothers should feel known, listened to, and protected.",
        "The environment matters. A delivery experience should not feel like being processed through a ward. It should feel calm, private, and human, with enough clinical readiness behind the scenes that the family can focus on the arrival of their child.",
        "Care continues after delivery through postnatal review, newborn care, immunization guidance, and family planning support. The aim is not only a safe birth; it is a steady beginning for mother, child, and household.",
      ],
      offers: [
        "Comprehensive antenatal care",
        "Normal and caesarean deliveries",
        "Family planning and counseling",
        "Immunization and child health",
        "Postnatal and newborn care",
        "High-risk pregnancy management",
      ],
      idealSummary:
        "Best for expectant mothers and families who want careful antenatal guidance, safe delivery options, and continuous support after birth.",
    },
  },
  {
    number: "04",
    eyebrow: "Child Health",
    title: "Pediatrics",
    description:
      "Children need more than quick symptom checks. They need clinicians who can notice growth, temperament, milestones, nutrition, school-age pressures, and the difference between a passing illness and a pattern worth following.",
    idealFor:
      "Well-child visits, immunization schedules, developmental screening, childhood illnesses, nutrition guidance, and adolescent health support.",
    ctaLabel: "Consult a Pediatrician",
    slug: "pediatrics",
    image: "/services/pediatrics.png",
    imageAlt:
      "A pediatrician warmly engaging a child in a bright clinic room with soft natural light.",
    relatedSlugs: ["maternity", "general-practice", "mental-health"],
    detail: {
      heroTagline: "Growing up healthy starts with a doctor who truly knows your child.",
      opening:
        "Parents look for two kinds of confidence when they bring a child to the doctor: clinical competence and a room where the child does not feel afraid. Pediatric care at Maryland is shaped around both needs.",
      pullQuote:
        "There is a difference between treating a child's symptoms and understanding the story of their development.",
      body: [
        "A child changes quickly. The cough, appetite change, school fatigue, or recurring fever matters most when it is understood against the child's age, history, growth, and home life. That is why continuity is so valuable in pediatrics.",
        "Our pediatric consultations support preventive care as much as illness care. Immunizations, well-child checks, nutrition conversations, and developmental screenings help families notice what is on track and respond early when something needs attention.",
        "As children become adolescents, care becomes more private, more conversational, and more attuned to emotional health. The goal remains the same: a young person who feels safe enough to speak and a parent who feels clinically guided.",
      ],
      offers: [
        "Well-child visits",
        "Immunizations and vaccination schedules",
        "Developmental screenings",
        "Adolescent health consultations",
        "Childhood illness management",
        "Nutritional guidance",
      ],
      idealSummary:
        "Best for parents who want a consistent pediatric partner from early childhood through adolescence, with prevention and development treated as seriously as illness.",
    },
  },
  {
    number: "05",
    eyebrow: "Women's Wellness",
    title: "Obstetrics & Gynecology",
    description:
      "Women's health deserves time, privacy, and clinical seriousness at every age. Maryland supports routine screenings, fertility questions, family planning, menopause care, and surgical needs with a tone that is respectful rather than rushed.",
    idealFor:
      "Women seeking annual wellness exams, family planning, fertility consultations, screening, menopause support, or gynecological procedures.",
    ctaLabel: "Schedule Consultation",
    slug: "obstetrics-gynecology",
    image: "/services/obstetrics-gynecology.png",
    imageAlt:
      "A professional and empathetic Nigerian female doctor in a focused OBGYN consultation within a modern, well-equipped clinic.",
    relatedSlugs: ["maternity", "diagnostic-laboratory", "internal-medicine"],
    detail: {
      heroTagline: "Comprehensive women's health, from routine wellness to complex care.",
      opening:
        "A woman should never feel hurried through a health concern that affects her body, fertility, comfort, or future. Obstetrics and Gynecology at Maryland is built around careful listening, clear explanation, and privacy that feels real.",
      pullQuote:
        "Every woman deserves a healthcare partner who listens without rushing and explains without condescension.",
      body: [
        "The work ranges from annual wellness visits and cervical screening to contraception, fertility conversations, menopause support, and gynecological surgery. Each concern deserves its own pace and its own level of detail.",
        "We approach women's health as a long arc, not a set of disconnected appointments. Reproductive years, pregnancy, postpartum recovery, hormonal transition, and later-life screening all belong to one continuous story of care.",
        "Respect is part of the clinical standard. Patients should be able to ask direct questions, understand their options, and make decisions with a physician who treats dignity as essential to good medicine.",
      ],
      offers: [
        "Annual wellness exams",
        "Family planning and contraception",
        "Menopause management",
        "Gynecological surgeries",
        "Cervical and breast screening",
        "Fertility consultations",
      ],
      idealSummary:
        "Best for women seeking confidential, comprehensive care across screening, reproductive health, pregnancy-adjacent concerns, and complex gynecological needs.",
    },
  },
  {
    number: "06",
    eyebrow: "Behavioral Health",
    title: "Mental Health",
    description:
      "Mental health care begins with a room where nothing has to be performed. Maryland offers confidential counseling and psychiatric support for anxiety, depression, grief, stress, adolescent concerns, and the difficult conversations many people postpone for too long.",
    idealFor:
      "Patients seeking therapy, psychiatric evaluation, stress support, depression care, grief counseling, or adolescent mental health guidance.",
    ctaLabel: "Book a Session",
    slug: "mental-health",
    image: "/services/mental-health.png",
    imageAlt:
      "A serene and professional mental health therapy suite at Maryland Healthcare, featuring a kind Nigerian therapist in a calm, private environment.",
    relatedSlugs: ["telemedicine", "pediatrics", "general-practice"],
    detail: {
      heroTagline: "A safe space for the conversations that matter most.",
      opening:
        "The first mental health appointment can feel heavier than the symptoms themselves. We understand that many people are taught to endure quietly, so our work begins with making help feel safe, private, and free of judgment.",
      pullQuote:
        "Strength is not silence; strength is choosing to get the help you need before pain becomes a permanent address.",
      body: [
        "Mental health support at Maryland is for the patient navigating anxiety before work, the parent grieving quietly, the adolescent withdrawing from family life, the adult whose sleep and focus have collapsed under stress, and anyone who needs a clinical space to be honest.",
        "Our approach combines counseling, psychiatric evaluation where appropriate, and practical care plans that respect the patient's context. We do not reduce people to labels. We listen for what has happened, what has changed, and what support would make life more manageable.",
        "Confidentiality and steadiness are central. Whether the first session happens in person or through supported telemedicine, the goal is to help patients move from isolation into care without shame.",
      ],
      offers: [
        "Individual counseling",
        "Psychiatric evaluations",
        "Stress and anxiety management",
        "Depression treatment",
        "Grief counseling",
        "Adolescent mental health support",
      ],
      idealSummary:
        "Best for patients and families who need private, compassionate support for emotional distress, life transitions, stress, or ongoing psychiatric concerns.",
    },
  },
  {
    number: "07",
    eyebrow: "Precision Diagnostics",
    title: "Diagnostic Laboratory",
    description:
      "Fast answers matter because waiting carries its own anxiety. Maryland's automated laboratory supports physicians with hematology, microbiology, chemical pathology, infection screening, hormonal assays, and routine checks that move treatment from suspicion to evidence.",
    idealFor:
      "Routine blood work, culture and sensitivity, liver and kidney profiles, malaria and hepatitis screening, fertility profiles, and employment medical checks.",
    ctaLabel: "View Lab Services",
    slug: "diagnostic-laboratory",
    image: "/services/diagnostic-laboratory.jpg",
    imageAlt:
      "A high-end diagnostic laboratory at Maryland Healthcare, showing a focused professional working with state-of-the-art automated systems.",
    relatedSlugs: ["general-practice", "internal-medicine", "emergency-trauma"],
    detail: {
      heroTagline: "Precision diagnostics that move at the speed of your treatment plan.",
      opening:
        "Few things are as unsettling as waiting for results that may explain what is happening in your body. A strong laboratory shortens that uncertainty and gives your physician the evidence needed to treat with precision.",
      pullQuote:
        "Accurate diagnosis is not a luxury; it is the foundation of effective treatment.",
      body: [
        "Maryland Healthcare's fully automated laboratory is built for speed, range, and quality control. From routine full blood counts to fertility profiles and infection screening, the goal is to remove guesswork from clinical decisions.",
        "The most useful result is not only accurate; it arrives when it can still shape the treatment plan. Fast turnaround helps doctors adjust medication, confirm infections, investigate organ function, and reassure patients with data rather than speculation.",
        "Every test sits inside a larger clinical conversation. Results are interpreted by the care team, connected back to symptoms, and used to guide the next step, whether that means treatment, monitoring, referral, or further investigation.",
      ],
      offers: [
        "Hematology and full blood count",
        "Microbiology including culture and sensitivity",
        "Chemical pathology including liver, kidney, and lipid panels",
        "Infection screening for malaria, typhoid, and hepatitis",
        "Hormonal assays and fertility profiles",
        "Routine medical and pre-employment checks",
      ],
      idealSummary:
        "Best for patients who need fast, reliable investigations and clinicians who want laboratory evidence to guide care without unnecessary delay.",
    },
  },
  {
    number: "08",
    eyebrow: "Critical Care",
    title: "24/7 Emergency & Trauma",
    description:
      "Emergency care must be immediate without becoming chaotic. Maryland's trauma response is staffed around the clock, prepared for acute injuries, cardiac events, surgical emergencies, pediatric crises, poisoning, overdose, and urgent stabilization.",
    idealFor:
      "Life-threatening symptoms, accident injuries, sudden severe illness, cardiac emergencies, pediatric emergencies, and trauma requiring immediate physician-led care.",
    ctaLabel: "Emergency Directions",
    slug: "emergency-trauma",
    image: "/services/emergency-trauma.jpg",
    imageAlt:
      "The modern and professional facade of Maryland Hospital, showing a state-of-the-art medical building with high-end architecture.",
    relatedSlugs: ["diagnostic-laboratory", "internal-medicine", "general-practice"],
    detail: {
      heroTagline: "When seconds count, we are already ready.",
      opening:
        "In an emergency, families need more than speed. They need a team that is already organized, already staffed, and already thinking several steps ahead.",
      pullQuote:
        "Every minute matters, and every minute here is covered by physicians trained for exactly this.",
      body: [
        "Maryland's emergency and trauma service is available 24 hours a day for accidents, acute illness, sudden severe pain, cardiac symptoms, poisoning, overdose, pediatric emergencies, and surgical crises. The atmosphere must be urgent, but the work must remain controlled.",
        "Fast care is only useful when it is thorough. Stabilization, examination, diagnostics, medication, surgical escalation, and admission decisions all have to happen with clarity under pressure.",
        "For a family arriving frightened, readiness is felt in small details: a phone number that is easy to find, staff who know their roles, physicians who can prioritize risk, and a hospital capable of continuing care after the first crisis is controlled.",
      ],
      offers: [
        "Acute trauma response",
        "Cardiac emergency care",
        "Surgical emergencies",
        "Pediatric emergencies",
        "Poisoning and overdose treatment",
        "Accident and injury stabilization",
      ],
      idealSummary:
        "Best for patients with severe symptoms, accidents, injuries, poisoning, or any medical crisis that cannot safely wait.",
    },
  },
  {
    number: "09",
    eyebrow: "Specialized Care",
    title: "Internal Medicine",
    description:
      "Internal medicine is where complex adult health is examined with patience. When symptoms cross systems or chronic conditions overlap, Maryland's internists connect the evidence, history, medication patterns, and risks into one careful plan.",
    idealFor:
      "Adults managing diabetes, hypertension, cardiovascular concerns, respiratory disease, gastrointestinal conditions, endocrine disorders, or multi-system symptoms.",
    ctaLabel: "Schedule Exam",
    slug: "internal-medicine",
    image: "/services/internal-medicine.png",
    imageAlt:
      "A senior internal medicine specialist at Maryland Healthcare reviewing complex medical data with a patient in a premium private office.",
    relatedSlugs: ["general-practice", "diagnostic-laboratory", "telemedicine"],
    detail: {
      heroTagline: "Where complex conditions meet unwavering attention to detail.",
      opening:
        "Some symptoms do not belong neatly to one organ, one test, or one quick answer. Internal medicine is the specialty that slows down enough to connect the pattern.",
      pullQuote:
        "True internal medicine is detective work: methodical, thorough, and deeply informed by your history.",
      body: [
        "Our internists manage adult conditions that require diagnostic depth, including diabetes, hypertension, cardiovascular risk, respiratory disease, gastrointestinal concerns, endocrine disorders, and multi-system complaints. The work is careful because the body is connected.",
        "A patient may arrive with fatigue, dizziness, pain, poor sleep, weight change, or unstable blood pressure. The task is not to chase each symptom separately, but to understand how history, examination, laboratory results, medication, and lifestyle are interacting.",
        "Internal medicine also provides coordination for patients who need multiple specialists. The goal is a plan that is coherent, monitored, and honest about what deserves attention now and what can be safely watched over time.",
      ],
      offers: [
        "Diabetes management",
        "Hypertension and cardiovascular care",
        "Respiratory disease management",
        "Gastrointestinal conditions",
        "Endocrine disorders",
        "Multi-system disease diagnosis and coordination",
      ],
      idealSummary:
        "Best for adults with chronic conditions, unclear symptoms, or complex medical histories that need specialist-level interpretation and coordination.",
    },
  },
];

export function getServiceBySlug(slug: string) {
  return servicesData.find((service) => service.slug === slug);
}

export function getRelatedServices(service: Service) {
  const related = service.relatedSlugs
    .map((slug) => getServiceBySlug(slug))
    .filter((item): item is Service => Boolean(item));

  if (related.length >= 3) {
    return related.slice(0, 3);
  }

  const fallback = servicesData.filter((item) => item.slug !== service.slug && !related.includes(item));
  return [...related, ...fallback].slice(0, 3);
}
