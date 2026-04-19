export type TopicNavItem = {
  slug: string;
  label: string;
  badge: string;
  title: string;
  copy: string;
  highlights: string[];
  featuredLinks: Array<{ href: string; label: string }>;
};

export const topicNavItems: TopicNavItem[] = [
  {
    slug: "games-quizzes",
    label: "Games & Quizzes",
    badge: "Play and practice",
    title: "Games and quizzes for science-curious minds",
    copy: "Explore interactive science challenges, revision drills, and playful knowledge checks built for continuous learning.",
    highlights: [
      "Timed quizzes for subject recall and exam prep",
      "Collaborative challenge rooms for clubs and study circles",
      "Topic-specific practice sets across STEM disciplines"
    ],
    featuredLinks: [
      { href: "/demo", label: "View demos" },
      { href: "/study-groups", label: "Join study groups" }
    ]
  },
  {
    slug: "history-society",
    label: "History & Society",
    badge: "Context and impact",
    title: "History and society through an evidence-first lens",
    copy: "Follow how science, people, and institutions shape the world with curated communities, discussions, and educational programming.",
    highlights: [
      "Discuss historical discoveries and scientific milestones",
      "Connect social issues to research, policy, and education",
      "Share annotated resources inside focused community spaces"
    ],
    featuredLinks: [
      { href: "/about", label: "About the platform" },
      { href: "/events-public", label: "Browse public events" }
    ]
  },
  {
    slug: "science-tech",
    label: "Science & Tech",
    badge: "Core disciplines",
    title: "Science and technology communities that stay practical",
    copy: "Move from curiosity to action with expert spaces, premium tools, and collaboration features tailored to technical learning.",
    highlights: [
      "Discover subject communities organized by real scientific depth",
      "Collaborate in calls, workspaces, labs, and knowledge vaults",
      "Upgrade into premium workflows when your team is ready"
    ],
    featuredLinks: [
      { href: "/platform", label: "Platform overview" },
      { href: "/features", label: "Explore features" }
    ]
  },
  {
    slug: "biographies",
    label: "Biographies",
    badge: "People and profiles",
    title: "Biographies, experts, and standout community voices",
    copy: "Highlight researchers, educators, student leaders, and contributors whose stories help others learn faster and aim higher.",
    highlights: [
      "Surface expert profiles and community leadership stories",
      "Track ambassadors, mentors, and notable contributors",
      "Build identity around achievements, interests, and impact"
    ],
    featuredLinks: [
      { href: "/science-communities", label: "Explore communities" },
      { href: "/for-educators", label: "For educators" }
    ]
  },
  {
    slug: "animals-nature",
    label: "Animals & Nature",
    badge: "Life and ecosystems",
    title: "Animals, nature, and the systems behind life",
    copy: "Dive into biology-rich spaces for ecology, fieldwork, biodiversity, observation, and interdisciplinary environmental learning.",
    highlights: [
      "Join science communities focused on biology and nature topics",
      "Share field notes, datasets, and recorded sessions",
      "Coordinate public events and collaborative learning activities"
    ],
    featuredLinks: [
      { href: "/science-communities", label: "Find a community" },
      { href: "/events-public", label: "See events" }
    ]
  },
  {
    slug: "geography-travel",
    label: "Geography & Travel",
    badge: "Places and movement",
    title: "Geography and travel for globally connected learners",
    copy: "Use events, communities, and collaboration spaces to connect across campuses, regions, and research environments.",
    highlights: [
      "Discover region-based science programming and events",
      "Coordinate distributed communities and mobile collaboration",
      "Share place-based learning resources and travel-ready plans"
    ],
    featuredLinks: [
      { href: "/events-public", label: "Public events" },
      { href: "/plans", label: "View plans" }
    ]
  },
  {
    slug: "arts-culture",
    label: "Arts & Culture",
    badge: "Creativity and expression",
    title: "Arts and culture spaces that complement scientific learning",
    copy: "Blend communication, design, storytelling, and culture with science education through richer communities and collaborative programming.",
    highlights: [
      "Create more engaging educational content and presentations",
      "Connect culture, communication, and interdisciplinary learning",
      "Support clubs, educators, and ambassadors with better storytelling"
    ],
    featuredLinks: [
      { href: "/integrations", label: "View integrations" },
      { href: "/contact", label: "Contact the team" }
    ]
  }
];

export const mainNavLinks = [
  { href: "/", label: "Home" },
  ...topicNavItems.map((item) => ({ href: `/topics/${item.slug}`, label: item.label }))
];

export const exploreLinks = [
  { href: "/platform", label: "Platform" },
  { href: "/features", label: "Features" },
  { href: "/integrations", label: "Integrations" },
  { href: "/science-communities", label: "Communities" },
  { href: "/study-groups", label: "Study Groups" },
  { href: "/for-educators", label: "For Educators" },
  { href: "/events-public", label: "Events" },
  { href: "/plans", label: "Plans" },
  { href: "/security", label: "Security" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" }
];

export const topicNavMap = new Map(topicNavItems.map((item) => [item.slug, item]));