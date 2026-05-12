export type InsightBlock =
  | {
      type: "paragraph" | "heading" | "quote";
      content: string;
    }
  | {
      type: "list";
      items: string[];
    };

export interface Insight {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  imageAlt: string;
  author: string;
  isFeatured?: boolean;
  body: InsightBlock[];
}

export const insightsData: Insight[] = [
  {
    slug: "preventative-care-heritage-institutions",
    category: "Clinical Excellence",
    title: "The Evolution of Preventative Care in Heritage Institutions",
    excerpt:
      "A detailed examination of how establishing a continuous narrative of care over four decades directly impacts long-term patient outcomes and community trust.",
    date: "May 3, 2026",
    image: "/insights/preventative-care-heritage-institutions.webp",
    imageAlt:
      "Vintage medical parchment with a brass stethoscope in warm editorial light.",
    author: "Maryland Healthcare Editorial Team",
    isFeatured: true,
    body: [
      {
        type: "paragraph",
        content:
          "Preventative care is often described as a modern discipline, but its deepest strength is memory. A heritage institution does not only treat a patient in the present; it holds years of context about families, occupations, neighborhood patterns, recurring illnesses, and the quiet changes that are easy to miss in isolated appointments.",
      },
      {
        type: "paragraph",
        content:
          "At Maryland Healthcare, prevention has evolved from annual checks into a longitudinal practice. The physician who sees a patient today may also understand the patient's parent with hypertension, the child with recurrent infections, or the corporate schedule that keeps routine reviews from happening on time. That continuity changes the quality of clinical suspicion.",
      },
      {
        type: "quote",
        content:
          "The most effective prevention is not a single screening; it is the disciplined act of noticing change over time.",
      },
      {
        type: "heading",
        content: "The Value of a Long Medical Memory",
      },
      {
        type: "paragraph",
        content:
          "Medicine becomes sharper when it has a baseline. Weight changes, blood pressure trends, recurring fatigue, rising blood sugar, missed immunizations, and family history all speak more clearly when they are compared against a known pattern. A new clinic may see a number; a long-standing hospital can often see a trajectory.",
      },
      {
        type: "paragraph",
        content:
          "This is especially important in a city where families carry both genetic risk and environmental pressure: stressful work rhythms, traffic, infection exposure, dietary shifts, and delayed care caused by cost or time. Preventative medicine has to meet those realities honestly. It must be practical enough to fit the life a patient actually lives.",
      },
      {
        type: "paragraph",
        content:
          "The future of prevention will be more digital, but it should not become less personal. Laboratory reminders, telemedicine follow-ups, screening schedules, and chronic disease reviews are most powerful when joined to a clinician who understands the patient behind the data.",
      },
      {
        type: "paragraph",
        content:
          "For Maryland, the work ahead is not to replace tradition with technology. It is to use modern access to protect the old promise: to know patients early enough, and well enough, that serious illness is not always allowed to become the first conversation.",
      },
    ],
  },
  {
    slug: "quiet-spaces-for-recovery",
    category: "Patient Experience",
    title: "Designing Quiet Spaces for Recovery",
    excerpt:
      "How architecture, daylight, privacy, and unhurried rooms can support healing before a prescription is ever written.",
    date: "September 28, 2025",
    image: "/insights/quiet-spaces-for-recovery.webp",
    imageAlt:
      "An elegant healthcare corridor with tall windows, soft daylight, and quiet architectural detail.",
    author: "Maryland Healthcare Editorial Team",
    body: [
      {
        type: "paragraph",
        content:
          "The body does not recover in abstraction. It recovers in rooms: under light, around sound, beside people, inside spaces that either calm the nervous system or keep it alert. Healthcare architecture is therefore never neutral. It becomes part of the patient's physiology.",
      },
      {
        type: "paragraph",
        content:
          "A quiet space does not mean luxury for its own sake. It means fewer avoidable irritants at a time when the patient's body is already working hard. Harsh lighting, crowded corridors, constant noise, confusing movement, and exposed conversations can all add subtle stress to a person who needs reserves for healing.",
      },
      {
        type: "quote",
        content:
          "Clinical excellence is not diminished by softness; in recovery, the environment can become one of the first forms of care.",
      },
      {
        type: "heading",
        content: "Light, Privacy, and the Pace of the Room",
      },
      {
        type: "paragraph",
        content:
          "Natural light helps orient the body. It supports sleep-wake rhythm, reduces the sense of confinement, and gives patients a view of time passing in a way that feels human. In a recovery setting, daylight is not decoration. It is part of the patient's re-entry into steadiness.",
      },
      {
        type: "paragraph",
        content:
          "Privacy matters just as much. Patients make better decisions when they can ask vulnerable questions without feeling overheard. Families process difficult news differently when a room allows them to pause. Even routine care feels more dignified when a patient is not made to feel on display.",
      },
      {
        type: "paragraph",
        content:
          "The most healing spaces also have a certain pace. Staff move with purpose, but not panic. Furniture supports conversation. Signage reduces uncertainty. Waiting areas give enough distance for quiet. These details do not replace medical treatment; they protect the patient's ability to receive it.",
      },
      {
        type: "paragraph",
        content:
          "For a heritage hospital, the challenge is to keep warmth while improving function. The best environments do not feel like showrooms. They feel settled, clean, familiar, and deeply considered, as if the institution has learned over decades that recovery begins long before discharge.",
      },
    ],
  },
  {
    slug: "botanical-principles-modern-medicine",
    category: "Holistic Wellness",
    title: "Integrating Botanical Principles in Modern Medicine",
    excerpt:
      "A sophisticated look at evidence-based holistic wellness and how it can complement, not compete with, clinical treatment.",
    date: "November 15, 2025",
    image: "/insights/botanical-principles-modern-medicine.webp",
    imageAlt:
      "Botanical apothecary jars and fresh herbs arranged on an oak table in soft natural light.",
    author: "Maryland Healthcare Editorial Team",
    body: [
      {
        type: "paragraph",
        content:
          "Botanical medicine has a long cultural memory, especially in communities where family knowledge, food traditions, and plant-based remedies have shaped everyday wellness for generations. The question for a modern hospital is not whether such traditions exist. The question is how they can be discussed responsibly inside evidence-based care.",
      },
      {
        type: "paragraph",
        content:
          "The answer begins with humility and rigor. Some botanical principles are sensible: nutrition, fiber, hydration, anti-inflammatory dietary patterns, sleep support, and the use of plants as part of a broader lifestyle strategy. Others require caution because natural does not automatically mean safe, and traditional does not automatically mean appropriate for every patient.",
      },
      {
        type: "quote",
        content:
          "Holistic care should widen the clinical conversation, not weaken the scientific standard.",
      },
      {
        type: "heading",
        content: "Complement, Not Substitute",
      },
      {
        type: "paragraph",
        content:
          "A patient taking medication for hypertension, diabetes, fertility treatment, infection, or surgery recovery should never add herbal preparations without discussing interactions. The liver and kidneys process both pharmaceutical and plant compounds. A well-meaning supplement can change bleeding risk, affect blood sugar, or reduce the effectiveness of prescribed medication.",
      },
      {
        type: "paragraph",
        content:
          "Yet rejecting botanical traditions entirely can also make care feel culturally disconnected. A better approach is clinical conversation. What is the patient already using? Who recommended it? What symptom are they trying to address? Is there evidence of benefit, risk, contamination, or interaction? These questions turn secrecy into safety.",
      },
      {
        type: "paragraph",
        content:
          "Modern medicine is strongest when it understands the whole patient: laboratory values, diagnosis, belief systems, diet, stress, family practices, and access to follow-up. Botanical principles can contribute to prevention and comfort when they are placed under the discipline of medical review.",
      },
      {
        type: "paragraph",
        content:
          "At Maryland Healthcare, holistic wellness is not a retreat from science. It is an invitation to speak honestly about the habits and traditions patients already carry, then shape them into a plan that is safe, informed, and clinically sound.",
      },
    ],
  },
  {
    slug: "community-health-trends-44-years",
    category: "Legacy & Research",
    title: "A 44-Year Retrospective on Community Health Trends",
    excerpt:
      "How health challenges in Port Harcourt have shifted since 1982, and how Maryland Healthcare has adapted with the city.",
    date: "April 2, 2026",
    image: "/insights/community-health-trends-44-years.webp",
    imageAlt:
      "Cream textured paper with a single-line pulse drawing in deep green ink.",
    author: "Maryland Healthcare Editorial Team",
    body: [
      {
        type: "paragraph",
        content:
          "A hospital that has served one city for 44 years becomes a witness. It sees not only individual illness, but the changing health profile of a community: what families feared in one decade, what became routine in another, and what new pressures arrived with urban growth.",
      },
      {
        type: "paragraph",
        content:
          "When Maryland Healthcare opened in 1982, the dominant concerns were often immediate and infectious: malaria, typhoid-like febrile illnesses, childhood infections, maternity risk, trauma, and conditions worsened by delayed access. Those concerns have not disappeared. They remain part of everyday clinical life in Port Harcourt.",
      },
      {
        type: "quote",
        content:
          "Community medicine is history made visible in the waiting room.",
      },
      {
        type: "heading",
        content: "From Acute Illness to Complex Continuity",
      },
      {
        type: "paragraph",
        content:
          "Over time, the city has also seen a rise in chronic disease. Hypertension, diabetes, cardiovascular risk, stress-related symptoms, fertility concerns, mental health needs, and medication management now sit beside infection and emergency care. The modern patient may need treatment for a fever today and a long-term plan for blood pressure tomorrow.",
      },
      {
        type: "paragraph",
        content:
          "Environmental and occupational realities matter as well. Port Harcourt's industrial character, commuting stress, economic pressure, and changing diets influence respiratory symptoms, sleep, metabolic health, and care-seeking behavior. A hospital cannot serve the city well if it pretends these pressures are outside the consultation room.",
      },
      {
        type: "paragraph",
        content:
          "Maryland's adaptation has been layered: stronger diagnostics, continuous maternity care, emergency readiness, chronic disease management, pediatric follow-up, mental health support, and now digital access through telemedicine. Each layer responds to a patient reality the institution has observed over time.",
      },
      {
        type: "paragraph",
        content:
          "The lesson from 44 years is clear. Community health is never static. A trusted hospital must keep its memory, but not become trapped by it. It must recognize old diseases, understand new patterns, and remain close enough to the people it serves to notice what is changing next.",
      },
    ],
  },
  {
    slug: "malaria-or-typhoid",
    category: "Clinical Insights",
    title: "Malaria or Typhoid? Why treating yourself is a dangerous gamble",
    excerpt:
      "Understanding the critical differences between common symptoms and the vital importance of professional diagnostic clarity.",
    date: "October 15, 2024",
    image: "/insights/malaria-or-typhoid.webp",
    imageAlt:
      "A precision microscope lens focused on a slide against a deep green clinical background.",
    author: "Maryland Healthcare Editorial Team",
    body: [
      {
        type: "paragraph",
        content:
          "Fever is familiar in Nigeria, and familiarity can make it dangerous. A patient feels hot, weak, achy, nauseated, or tired, then reaches for what worked last time: antimalarial tablets, antibiotics, pain relievers, or a combination recommended by a neighbor. The symptoms may feel ordinary. The risk is that the diagnosis may not be.",
      },
      {
        type: "paragraph",
        content:
          "Malaria and typhoid are often spoken of together, but they are not interchangeable illnesses. They have different causes, different treatments, different complications, and different public health implications. Treating one while assuming the other can delay the right care and make a manageable condition more severe.",
      },
      {
        type: "quote",
        content:
          "Self-treatment replaces diagnosis with memory, and memory is not a laboratory result.",
      },
      {
        type: "heading",
        content: "Why Guesswork Fails",
      },
      {
        type: "paragraph",
        content:
          "The body has a limited vocabulary for illness. Fever, headache, weakness, abdominal discomfort, vomiting, diarrhea, appetite loss, and body pains can come from malaria, typhoid, viral infections, food-borne illness, urinary infection, hepatitis, respiratory disease, medication reactions, or more serious inflammatory conditions. Similar symptoms do not prove the same disease.",
      },
      {
        type: "paragraph",
        content:
          "Unnecessary antibiotics create their own harm. They can cause side effects, disturb the gut, and contribute to antimicrobial resistance, making future infections harder to treat. Unnecessary or incomplete antimalarial treatment can also complicate clinical assessment and delay recognition of another cause.",
      },
      {
        type: "paragraph",
        content:
          "Precise laboratory testing changes the conversation. Blood films or rapid malaria tests, full blood count, cultures when indicated, liver and kidney profiles, and clinical examination help physicians determine what is actually happening. The goal is not to order tests for ceremony; it is to make treatment specific enough to work.",
      },
      {
        type: "paragraph",
        content:
          "A fever that persists, worsens, returns, or appears with confusion, severe weakness, jaundice, dehydration, breathing difficulty, pregnancy, infancy, or chronic illness deserves prompt medical attention. In those moments, guessing is not thrift. It is a gamble with time.",
      },
    ],
  },
  {
    slug: "new-digital-face",
    category: "Announcements",
    title: "Welcome to the New Digital Face of Maryland Healthcare",
    excerpt:
      "An open letter from the CMD on bridging 44 years of physical legacy with a new era of digital accessibility.",
    date: "October 10, 2024",
    image: "/insights/new-digital-face.webp",
    imageAlt:
      "A frosted glass Maryland Healthcare plaque mounted on a cream stone wall.",
    author: "Dr. Stephen Ekwelibe, Chief Medical Director",
    body: [
      {
        type: "paragraph",
        content:
          "For 44 years, Maryland Healthcare has been a physical presence in Port Harcourt: a place families knew how to find, a name shared between colleagues, a hospital remembered by parents and then trusted by their children. That kind of presence is not built quickly. It is built one consultation, one delivery, one emergency, and one recovered patient at a time.",
      },
      {
        type: "paragraph",
        content:
          "Our new digital face does not change that history. It extends it. A website is not a hospital, but it can become a clearer doorway into one. It can help a patient find the emergency line quickly, understand available services, request an appointment, read responsible health guidance, and begin a relationship before arriving at the front desk.",
      },
      {
        type: "quote",
        content:
          "Digital access should make an old promise easier to reach: careful medicine, delivered by people who know the weight of trust.",
      },
      {
        type: "heading",
        content: "Continuity in a New Form",
      },
      {
        type: "paragraph",
        content:
          "Healthcare is changing. Patients expect speed, clarity, and mobile access. Families compare options before they visit. Corporate and HMO patients want confirmation that their benefits will be honored. Young professionals want follow-up without losing half a day to traffic. These expectations are reasonable, and a serious institution must meet them with discipline.",
      },
      {
        type: "paragraph",
        content:
          "But modernization should not make care feel anonymous. The task is to combine digital convenience with the familiar human standards that have always defined Maryland: careful listening, clinical judgment, continuity, and respect for family context.",
      },
      {
        type: "paragraph",
        content:
          "This platform is therefore more than a redesign. It is a commitment to make access less confusing and communication more direct. It gives our services a clearer structure, our emergency information a more prominent place, and our patients a calmer way to begin.",
      },
      {
        type: "paragraph",
        content:
          "We remain what we have always aimed to be: a trusted healthcare institution rooted in Port Harcourt. The difference now is that the first conversation can begin wherever the patient is.",
      },
    ],
  },
  {
    slug: "future-of-care-telemedicine",
    category: "Leadership",
    title: "The Future of Care: Dr. Toochi Ibe on the Rise of Telemedicine",
    excerpt:
      "Dr. Toochi Ibe explores how technology can preserve clinical intimacy while expanding access for Nigerian patients.",
    date: "January 10, 2026",
    image: "/insights/future-of-care-telemedicine.webp",
    imageAlt:
      "A professional portrait of a doctor in a refined office with bookshelves and warm daylight.",
    author: "Dr. Toochi Ibe",
    body: [
      {
        type: "paragraph",
        content:
          "For more than four decades, Maryland Healthcare has been a physical anchor for families in Port Harcourt. Dr. Toochi Ibe's recent research presentation asks an important next question: how can that trusted relationship travel beyond the hospital walls without losing its clinical seriousness?",
      },
      {
        type: "quote",
        content:
          "Telemedicine is not the disappearance of the doctor-patient relationship; at its best, it is the removal of unnecessary distance from it.",
      },
      {
        type: "paragraph",
        content:
          "Telemedicine, also called e-health, uses technology to deliver care remotely. Through video, voice, messaging, and digital sharing of test results, patients can consult doctors, receive medical advice, review laboratory findings, and decide whether an in-person visit is needed. The model is not new, but global adoption accelerated sharply in 2020 as patients and hospitals confronted the realities of COVID-19.",
      },
      {
        type: "heading",
        content: "A Nigerian Reality, Not a Distant Trend",
      },
      {
        type: "paragraph",
        content:
          "Dr. Ibe's work places Nigeria inside a wider digital health movement. Platforms such as Mobihealth International, iWello, and CribMD have shown that mobile technology can bridge distance, reduce waiting time, and provide structured access for underserved communities. For Port Harcourt patients, the value is practical: fewer unnecessary trips, faster triage, and more convenient chronic care support.",
      },
      {
        type: "list",
        items: [
          "Reduced waiting time for appropriate consultations and follow-ups.",
          "Lower exposure risk when physical contact is not clinically required.",
          "Easier chronic care management for conditions such as hypertension and diabetes.",
          "More private access to mental health counseling and support.",
        ],
      },
      {
        type: "paragraph",
        content:
          "The promise is significant, but it must be approached honestly. Electricity, internet reliability, data protection, patient privacy, and clinical documentation are not minor details. They determine whether telemedicine becomes safe healthcare or merely convenient conversation. Secure systems and responsible electronic medical records, including platforms such as Helium Health, are part of that foundation.",
      },
      {
        type: "paragraph",
        content:
          "Maryland Healthcare's opportunity is to build digital access around its strongest asset: relationship. A virtual consultation should still feel careful. It should still protect privacy, ask the right questions, review relevant results, and escalate appropriately when a physical examination is needed.",
      },
      {
        type: "paragraph",
        content:
          "The future of care is not only more digital. It is more reachable. If technology helps a patient speak to a doctor earlier, understand a result sooner, or manage a chronic condition with greater consistency, then it has served medicine's oldest purpose: to bring competent help closer to the person who needs it.",
      },
    ],
  },
];

export function getInsightBySlug(slug: string) {
  return insightsData.find((insight) => insight.slug === slug);
}

export function getFeaturedInsight() {
  return insightsData.find((insight) => insight.isFeatured) ?? insightsData[0];
}

export function getSecondaryInsights() {
  const featured = getFeaturedInsight();
  return insightsData.filter((insight) => insight.slug !== featured.slug);
}
