import { motion } from 'framer-motion';
import { FileText, MapPin, MailCheck, Globe, ArrowRight, Mail, Search } from 'lucide-react';
import type { TabId } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: TabId;
  icon: React.ElementType;
  tag: string;
  title: string;
  titleAccent: string;
  description: string;
  badges: string[];
  cta: string;
}

const PRODUCTS: Product[] = [
  {
    id: 'proposal',
    icon: FileText,
    tag: 'AI Writer',
    title: 'Upwork Proposal',
    titleAccent: 'Generator',
    description: 'Generate high-conversion, AI-personalised proposals in seconds. Specific past experience, dynamic delivery timelines, and production-ready PDF export.',
    badges: ['GPT-4o', 'PDF Export', '3 Templates', 'Live Editor'],
    cta: 'Generate Proposal',
  },
  {
    id: 'maps',
    icon: MapPin,
    tag: 'Scraper',
    title: 'Google Maps',
    titleAccent: 'Scraper',
    description: 'Extract business name, phone, website, address, and ratings from Google Maps search results. Export everything to CSV with one click.',
    badges: ['Playwright', 'CSV Export', 'Phone + Website', 'No Limit'],
    cta: 'Open Scraper',
  },
  {
    id: 'email',
    icon: MailCheck,
    tag: 'Verifier',
    title: 'Email',
    titleAccent: 'Verifier',
    description: 'Validate email addresses with syntax checks, MX record lookups, SMTP handshakes, disposable domain detection, and role account flagging.',
    badges: ['SMTP Check', 'MX Records', 'CSV / Excel', 'No API Key'],
    cta: 'Verify Emails',
  },
  {
    id: 'domain',
    icon: Globe,
    tag: 'Finder',
    title: 'Domain',
    titleAccent: 'Finder',
    description: 'Find official company websites using DuckDuckGo search + GPT-4o-mini. Upload a CSV or Excel file to look up hundreds of companies in bulk.',
    badges: ['DuckDuckGo', 'GPT-4o-mini', 'CSV / Excel', 'Bulk Lookup'],
    cta: 'Find Domains',
  },
];

const COMING_SOON = [
  { icon: Globe,   label: 'LinkedIn Outreach AI' },
  { icon: Mail,    label: 'Cold Email Generator' },
  { icon: Search,  label: 'SEO Content Writer'   },
];

interface Props {
  onNavigate: (tab: TabId) => void;
}

export default function DashboardPage({ onNavigate }: Props) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-8 pb-16 space-y-6">

        {/* Hero banner */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-8 bg-primary text-on-primary min-h-[180px] flex flex-col justify-center"
        >
          <div className="relative z-10 max-w-lg">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary-fixed mb-2">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </p>
            <h1 className="text-3xl font-bold leading-tight mb-2">
              Your AI-Powered<br />Business Toolkit
            </h1>
            <p className="text-sm text-on-primary-container leading-relaxed">
              Production-grade AI tools for freelancers and agencies. Pick a tool and get to work.
            </p>
          </div>
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none">
            <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-secondary blur-3xl" />
            <div className="absolute right-20 bottom-0 w-32 h-32 rounded-full bg-tertiary blur-2xl" />
          </div>
        </motion.section>

        {/* Product cards */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Available Tools</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PRODUCTS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => onNavigate(p.id)}
                  className="card cursor-pointer border border-outline-variant rounded-2xl p-6 hover:border-secondary/40 hover:shadow-lg transition-all group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                      <Icon size={20} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest border border-secondary/30 text-secondary bg-secondary/5 px-2.5 py-1 rounded-full">
                      {p.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-on-surface mb-1">
                    {p.title}{' '}
                    <span className="text-secondary">{p.titleAccent}</span>
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
                    {p.description}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {p.badges.map(b => (
                      <span key={b} className="text-[10px] font-semibold text-on-surface-variant bg-surface-container border border-outline-variant px-2.5 py-1 rounded-md">
                        {b}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity group-hover:gap-3">
                    {p.cta}
                    <ArrowRight size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}
