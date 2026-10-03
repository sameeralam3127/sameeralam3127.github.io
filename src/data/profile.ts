/**
 * Single source of truth for all site content.
 *
 * Edit this file to change what the site says; components only read from it.
 * Every fact here should be verifiable — no invented metrics or roles.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Link {
  label: string;
  href: string;
}

export interface SocialLink extends Link {
  /** Icon key understood by `components/ui/Icon.astro`. */
  icon: "github" | "linkedin" | "mail" | "globe";
  /** Short handle shown next to the icon, e.g. `sameeralam3127`. */
  handle: string;
}

export interface Stat {
  value: string;
  unit?: string;
  label: string;
}

export interface Principle {
  /** One of the five properties infrastructure should have. */
  property: "observable" | "reproducible" | "secure" | "diagnosable" | "resilient";
  summary: string;
}

export interface SkillGroup {
  /** Rendered like a Kubernetes namespace, e.g. `orchestration`. */
  id: string;
  title: string;
  items: string[];
}

export type ProjectStatus = "active" | "in-progress" | "rebuilding" | "stable";

export interface Project {
  /** URL slug, also used for `/projects/<slug>` deep-dive pages. */
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: ProjectStatus;
  /** Short status note, e.g. `v3.0 in progress`. */
  statusNote?: string;
  stack: string[];
  /** `owner/name` on GitHub. Used for links and build-time stats. */
  repo: string;
  /**
   * `false` when the repository is not publicly reachable yet. The site then
   * shows the project without a repo link and skips it when fetching stats.
   */
  repoPublic: boolean;
  links?: Link[];
  featured: boolean;
}

export interface Role {
  company: string;
  title: string;
  start: string;
  /** Omit for the current role. */
  end?: string;
  location?: string;
  highlights: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface Contribution {
  project: string;
  /** `owner/name` on GitHub. */
  repo: string;
  status: "merged" | "contributing";
  summary: string;
  href: string;
}

export interface Certification {
  name: string;
  issuer: string;
  /** Free text such as `Oct 2024`; omit when unknown. */
  issued?: string;
  expired?: boolean;
  featured: boolean;
}

export interface Article {
  title: string;
  description: string;
  href: string;
  topic: string;
}

export interface Profile {
  name: string;
  /** Public title. Never "DevOps Engineer" or "Technical Lead". */
  title: string;
  handle: string;
  location: string;
  timezone: string;
  yearsExperience: number;
  /** Year the career started; used to keep `yearsExperience` honest in tests. */
  careerStartYear: number;
  headline: string;
  summary: string[];
  focus: string[];
  stats: Stat[];
  principles: Principle[];
  skills: SkillGroup[];
  projects: Project[];
  experience: Role[];
  education: Education[];
  openSource: Contribution[];
  certifications: Certification[];
  writing: {
    name: string;
    href: string;
    description: string;
    /** Curated fallback; Phase 2 replaces this with a build-time fetch when available. */
    articles: Article[];
  };
  resume: {
    docx: string;
    /** Set once the PDF is generated at build time. */
    pdf?: string;
  };
  contact: {
    email: string;
    social: SocialLink[];
  };
  site: {
    url: string;
    repo: string;
    description: string;
  };
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const GITHUB = "https://github.com/sameeralam3127";

export const profile: Profile = {
  name: "Sameer Alam",
  title: "Infrastructure & Security Engineer",
  handle: "sameeralam3127",
  location: "Bengaluru, India",
  timezone: "Asia/Kolkata",
  yearsExperience: 8,
  careerStartYear: 2018,
  headline:
    "I build, automate and operate infrastructure that is observable, reproducible, secure, diagnosable and resilient.",
  summary: [
    "Eight years building, automating and operating software and infrastructure — from enterprise Linux fleets to Kubernetes platforms.",
    "I work automation-first: if a task happens twice, it becomes a script, a playbook or a pipeline. Then I make it observable so the next failure explains itself.",
  ],
  focus: [
    "Kubernetes",
    "Linux",
    "AWS",
    "Terraform",
    "Ansible",
    "CI/CD & GitOps",
    "Observability",
    "SRE",
    "DevSecOps",
    "Python · Go · Shell",
    "AI/LLM tooling",
  ],
  stats: [
    { value: "8", unit: "yrs", label: "building & operating infrastructure" },
    { value: "500", unit: "+", label: "servers supported across RHEL, AIX, SUSE, Ubuntu" },
    { value: "6", label: "infrastructure & automation projects built" },
    { value: "1", label: "collection on Ansible Galaxy" },
  ],
  principles: [
    {
      property: "observable",
      summary:
        "Every system emits the metrics, logs and events needed to answer “what is it doing right now?” without SSH.",
    },
    {
      property: "reproducible",
      summary:
        "Infrastructure is code. Any environment can be rebuilt from a repo and a pipeline, not from memory.",
    },
    {
      property: "secure",
      summary:
        "Least privilege, scanned dependencies and no secrets in source — security is a default, not a review step.",
    },
    {
      property: "diagnosable",
      summary:
        "Failures leave a trail. Runbooks, health checks and clear signals shorten the path from alert to root cause.",
    },
    {
      property: "resilient",
      summary:
        "Systems expect failure: they degrade gracefully, recover automatically and are tested against breaking.",
    },
  ],
  skills: [
    {
      id: "orchestration",
      title: "Containers & orchestration",
      items: ["Kubernetes", "OpenShift", "Docker", "Podman", "kind", "kubeadm"],
    },
    {
      id: "systems",
      title: "Linux & systems",
      items: ["RHEL", "SUSE", "Ubuntu", "Debian", "AIX", "Bash", "Networking"],
    },
    {
      id: "cloud-iac",
      title: "Cloud & infrastructure as code",
      items: ["AWS", "Terraform", "Ansible", "Ansible Galaxy collections"],
    },
    {
      id: "delivery",
      title: "CI/CD & GitOps",
      items: ["GitHub Actions", "GitOps", "Jenkins", "Git"],
    },
    {
      id: "observability",
      title: "Observability & SRE",
      items: [
        "Prometheus",
        "Grafana",
        "Nagios",
        "Root cause analysis",
        "Runbooks",
        "Incident response",
      ],
    },
    {
      id: "security",
      title: "Security",
      items: [
        "DevSecOps",
        "Linux hardening",
        "TLS certificate lifecycle automation",
        "Secret scanning",
        "Least-privilege CI",
      ],
    },
    {
      id: "languages",
      title: "Languages",
      items: ["Python", "Go", "Shell", "TypeScript"],
    },
    {
      id: "ai",
      title: "AI / LLM tooling",
      items: ["Ollama", "Hugging Face", "FastAPI", "Gradio", "RAG", "Gemini Enterprise"],
    },
  ],
  projects: [
    {
      slug: "kuberescue",
      name: "KubeRescue",
      tagline: "Kubernetes failure detection and auto-remediation",
      description:
        "Autonomous Kubernetes failure detection and policy-driven auto-remediation engine for SRE teams.",
      status: "active",
      stack: ["Go", "Kubernetes", "SRE", "Incident response"],
      repo: "sameeralam3127/KubeRescue",
      repoPublic: true,
      links: [{ label: "Docs", href: "https://sameeralam3127.github.io/KubeRescue/" }],
      featured: true,
    },
    {
      slug: "linuxvitals",
      name: "LinuxVitals",
      tagline: "Agentless Linux fleet health checks",
      description:
        "Ansible collection for Linux fleet health checks across RHEL, Fedora, Ubuntu and SUSE: baseline/postcheck comparison, opt-in self-healing and a self-contained HTML dashboard.",
      status: "active",
      statusNote: "on Ansible Galaxy",
      stack: ["Ansible", "Python", "Linux", "Monitoring"],
      repo: "sameeralam3127/linux-vitals",
      repoPublic: true,
      links: [
        {
          label: "Ansible Galaxy",
          href: "https://galaxy.ansible.com/ui/repo/published/sameeralam3127/linux_vitals/",
        },
        { label: "Docs", href: "https://sameeralam3127.github.io/linux-vitals/" },
      ],
      featured: true,
    },
    {
      slug: "ipmg",
      name: "IPMG",
      tagline: "Network monitoring from the command line",
      description:
        "Python tool that finds which hosts on your network are up and what changed since last time: parallel ping sweeps, reverse DNS, scan history and diffs, Excel/CSV/JSON/Markdown reports and a local web UI.",
      status: "in-progress",
      statusNote: "v3.0 in progress",
      stack: ["Python", "Networking", "CLI"],
      repo: "sameeralam3127/ipmg",
      repoPublic: true,
      links: [
        { label: "PyPI", href: "https://pypi.org/project/ipmg/" },
        { label: "Docs", href: "https://sameeralam3127.github.io/ipmg/" },
      ],
      featured: true,
    },
    {
      slug: "ai-ansible-generator",
      name: "AI Ansible Generator",
      tagline: "Plain English → validated Ansible playbooks",
      description:
        "Turns a plain-English request into an Ansible playbook, then validates YAML, syntax and safety and runs a repair loop until it passes. FastAPI + Gradio, backed by Ollama or Hugging Face models.",
      status: "active",
      stack: ["Python", "FastAPI", "Gradio", "Ollama", "Hugging Face", "Ansible"],
      repo: "sameeralam3127/ai-ansible-generator",
      repoPublic: false,
      links: [
        {
          label: "Live demo",
          href: "https://huggingface.co/spaces/sameeralam3127/ai-ansible-generator",
        },
      ],
      featured: true,
    },
    {
      slug: "kubernetes-platform",
      name: "kubernetes-platform",
      tagline: "Production-oriented Kubernetes platform",
      description:
        "A production-oriented Kubernetes platform, currently being rebuilt from the ground up as v2.",
      status: "rebuilding",
      statusNote: "v2 rebuild",
      stack: ["Kubernetes", "GitOps", "Terraform", "Observability"],
      repo: "sameeralam3127/kubernetes-platform",
      repoPublic: false,
      featured: true,
    },
    {
      slug: "trend-publisher",
      name: "trend-publisher",
      tagline: "Automated content pipeline",
      description: "Automated content pipeline that publishes through the Meta Graph API.",
      status: "active",
      stack: ["Python", "Meta Graph API", "Automation"],
      repo: "sameeralam3127/trend-publisher",
      repoPublic: false,
      featured: true,
    },
    {
      slug: "k8s-kubeadm-lab",
      name: "k8s-kubeadm-lab",
      tagline: "Reproducible multi-node kubeadm lab",
      description:
        "Build a real multi-node kubeadm cluster across a Mac and a Windows machine, then practise rollouts, RBAC, etcd disaster recovery, upgrades and troubleshooting.",
      status: "stable",
      stack: ["Kubernetes", "kubeadm", "Calico", "Shell"],
      repo: "sameeralam3127/k8s-kubeadm-lab",
      repoPublic: true,
      featured: false,
    },
    {
      slug: "devops-case-studies",
      name: "devops-case-studies",
      tagline: "Production case studies",
      description:
        "DevOps, SRE, cloud and platform engineering case studies covering architecture, troubleshooting, reliability, security and production operations.",
      status: "active",
      stack: ["SRE", "Kubernetes", "Terraform", "GitOps"],
      repo: "sameeralam3127/devops-case-studies",
      repoPublic: true,
      links: [{ label: "Site", href: "https://sameeralam3127.github.io/devops-case-studies/" }],
      featured: false,
    },
    {
      slug: "devterm",
      name: "devterm",
      tagline: "One-command terminal setup for SREs",
      description:
        "iTerm2, Terminal.app and Starship setup with themed profiles, Nerd Font icons and a git/Kubernetes/AWS-aware prompt.",
      status: "stable",
      stack: ["Shell", "Homebrew", "Starship"],
      repo: "sameeralam3127/devterm",
      repoPublic: true,
      featured: false,
    },
    {
      slug: "secure-exam-portal",
      name: "SecureExamPortal",
      tagline: "Online exam platform with integrity controls",
      description:
        "FastAPI + PostgreSQL API, React/Vite frontend, background worker and Nginx edge, with role-based dashboards, secure auth and exam-integrity controls.",
      status: "stable",
      stack: ["FastAPI", "PostgreSQL", "React", "Docker", "Nginx"],
      repo: "sameeralam3127/SecureExamPortal",
      repoPublic: true,
      featured: false,
    },
    {
      slug: "llm-dev-kit",
      name: "llm-dev-kit",
      tagline: "Local LLM + RAG toolkit",
      description:
        "Local LLM and RAG development toolkit using Ollama, Streamlit, ChromaDB and Redis for prompt, PDF and vector-search experiments.",
      status: "stable",
      stack: ["Ollama", "ChromaDB", "Redis", "Docker"],
      repo: "sameeralam3127/llm-dev-kit",
      repoPublic: true,
      featured: false,
    },
  ],
  experience: [
    {
      company: "IBM",
      title: "Technical Support Professional",
      start: "Jun 2021",
      location: "Bengaluru",
      highlights: [
        "Operate and support 500+ servers across RHEL, AIX, SUSE, Ubuntu, Debian and Windows Server.",
        "Automate patching, health checks and routine operations with Shell, Python and Ansible.",
        "Built and maintain automation for SSL/TLS certificate lifecycle management.",
        "Root cause analysis using Prometheus, Grafana, Nagios, API monitoring and system-level debugging.",
        "Contribute CI/CD automation with GitHub Actions, plus runbooks and operational guidance for the team.",
      ],
    },
    {
      company: "EY",
      title: "System Engineer",
      start: "Feb 2020",
      end: "May 2021",
      highlights: [
        "Supported enterprise PHP and Java applications; diagnosed production issues and shipped fixes that cut downtime by 30%.",
        "Managed production releases, configuration changes and hotfixes before CI/CD was in place.",
      ],
    },
    {
      company: "Netsoft Consulting Services",
      title: "System Engineer",
      start: "Dec 2018",
      end: "Feb 2020",
      highlights: [
        "Maintained enterprise applications and operating systems; troubleshot production issues to keep downtime minimal.",
      ],
    },
    {
      company: "Quatrro",
      title: "Solutions Engineer",
      start: "May 2018",
      end: "Dec 2018",
      highlights: [
        "Remote technical support for US customers across network, OS and application issues.",
      ],
    },
  ],
  education: [
    { degree: "MCA", institution: "Jain University, Bangalore", year: "2024" },
    { degree: "BCA", institution: "Magadh University", year: "2017" },
  ],
  openSource: [
    {
      project: "IBM/docling-pipelines",
      repo: "IBM/docling-pipelines",
      status: "merged",
      summary: "Refactored the Ollama client to hoist repeated imports out of hot-path methods.",
      href: "https://github.com/IBM/docling-pipelines/pull/133",
    },
    {
      project: "K8sGPT (CNCF)",
      repo: "k8sgpt-ai/k8sgpt",
      status: "contributing",
      summary: "Contributing to the CNCF project that diagnoses Kubernetes clusters with AI.",
      href: "https://github.com/k8sgpt-ai/k8sgpt",
    },
  ],
  certifications: [
    {
      name: "Google Cloud Certified Partner Specialist — Gemini Enterprise Agent Development",
      issuer: "Google Cloud",
      featured: true,
    },
    {
      name: "Certified Partner Specialist — Gemini Enterprise Deployment",
      issuer: "Google Cloud",
      featured: true,
    },
    { name: "Build with Gemini", issuer: "Google", featured: true },
    {
      name: "Monitor and Manage Google Cloud Resources (skill badge)",
      issuer: "Google",
      issued: "Oct 2024",
      featured: false,
    },
    {
      name: "The Basics of Google Cloud Compute (skill badge)",
      issuer: "Google",
      issued: "Oct 2024",
      featured: false,
    },
    { name: "AWS Knowledge: Cloud Essentials", issuer: "AWS", issued: "Jan 2024", featured: false },
    { name: "AWS Knowledge: Architecting", issuer: "AWS", issued: "Oct 2023", featured: false },
    {
      name: "Pen Testing, Incident Response & Forensics",
      issuer: "IBM",
      issued: "Sep 2023",
      featured: false,
    },
    { name: "Networking Essentials", issuer: "Cisco", issued: "Feb 2023", featured: false },
    {
      name: "AWS Cloud Quest: Cloud Practitioner",
      issuer: "AWS",
      issued: "Dec 2022",
      featured: false,
    },
    {
      name: "Docker Essentials: A Developer Introduction",
      issuer: "IBM",
      issued: "Nov 2022",
      featured: false,
    },
    { name: "Cybersecurity Essentials", issuer: "Cisco", issued: "Nov 2020", featured: false },
    {
      name: "CyberArk Certified Level 1: Trustee",
      issuer: "CyberArk",
      issued: "Oct 2020",
      featured: false,
    },
    {
      name: "NSE 2 Network Security Associate",
      issuer: "Fortinet",
      issued: "May 2020",
      expired: true,
      featured: false,
    },
  ],
  writing: {
    name: "Compute Central",
    href: "https://computecentral.in/",
    description:
      "Practical guides on Kubernetes, Ansible, Terraform, CI/CD, SRE and security, written from day-to-day operations work.",
    articles: [
      {
        title: "Kubernetes Debugging: Events, describe, and exec",
        description:
          "A repeatable Kubernetes debugging methodology using kubectl describe, get events, ephemeral debug containers, exec, port-forward and cp.",
        href: "https://computecentral.in/kubernetes/observability/04-events-and-debugging/",
        topic: "kubernetes",
      },
      {
        title: "Ansible Linux Server Hardening Playbook",
        description:
          "SSH lockdown, firewall rules, unattended upgrades and fail2ban, applied idempotently across a fleet.",
        href: "https://computecentral.in/ansible/case-studies/03-linux-server-hardening/",
        topic: "ansible",
      },
      {
        title: "Site Reliability Engineering: SLOs, Incidents, and On-Call",
        description:
          "SLOs and error budgets, burn-rate alerts, incident response, postmortems, on-call, toil and capacity planning.",
        href: "https://computecentral.in/sre/",
        topic: "sre",
      },
      {
        title: "DevSecOps and Cloud Security: A Practical Learning Path",
        description:
          "Threat modeling, Vault, supply chain security, container and IaC scanning, zero trust and hardening.",
        href: "https://computecentral.in/security/",
        topic: "security",
      },
    ],
  },
  resume: {
    docx: "/Resume.docx",
    pdf: "/Sameer-Alam-Resume.pdf",
  },
  contact: {
    email: "sameeralam3127@gmail.com",
    social: [
      { label: "GitHub", href: GITHUB, icon: "github", handle: "sameeralam3127" },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/sameer-alam-9a0162111/",
        icon: "linkedin",
        handle: "sameer-alam",
      },
      {
        label: "Compute Central",
        href: "https://computecentral.in/",
        icon: "globe",
        handle: "computecentral.in",
      },
    ],
  },
  site: {
    url: "https://sameeralam3127.github.io",
    repo: `${GITHUB}/sameeralam3127.github.io`,
    description:
      "Sameer Alam — Infrastructure & Security Engineer. Kubernetes, Linux, AWS, Terraform, Ansible, CI/CD, observability and SRE.",
  },
};

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export const featuredProjects = profile.projects.filter((p) => p.featured);
export const otherProjects = profile.projects.filter((p) => !p.featured);

export const repoUrl = (repo: string): string => `https://github.com/${repo}`;

/** `owner/name` → `name`. */
export const repoName = (repo: string): string => repo.slice(repo.indexOf("/") + 1);
