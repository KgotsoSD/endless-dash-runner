import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MapPin, Mail, Facebook, Instagram, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { to: '/', label: 'Welcome' },
  { to: '/about', label: 'About Us' },
  { to: '/programs', label: 'Programs' },
  { to: '/fees', label: 'Fees' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/faq', label: 'FAQ' },
  { to: '/book', label: 'Book' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { session } = useAuth();

  return (
    <header className="sticky top-0 z-50">
      {/* Top info bar */}
      <div className="bg-secondary text-secondary-foreground text-xs py-2 px-4 hidden md:block">
        <div className="container-main flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              123 Sunshine Street, Your City, South Africa
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              info@twinstars.co.za
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-80 mr-1">Follow Us:</span>
            <a href="#" className="hover:opacity-80 transition-opacity" aria-label="Facebook"><Facebook className="w-3.5 h-3.5" /></a>
            <a href="#" className="hover:opacity-80 transition-opacity" aria-label="Instagram"><Instagram className="w-3.5 h-3.5" /></a>
          </div>
        </div>
      </div>

      {/* Wavy separator under top bar */}
      <div className="hidden md:block bg-card overflow-hidden leading-[0]">
        <svg viewBox="0 0 1440 16" preserveAspectRatio="none" className="w-full h-[8px]">
          <path d="M0,0 L0,8 Q360,16 720,8 Q1080,0 1440,8 L1440,0 Z" fill="hsl(var(--secondary))" />
        </svg>
      </div>

      {/* Main nav */}
      <div className="bg-card/98 backdrop-blur-md shadow-sm border-b border-border">
        <div className="container-main flex items-center justify-between px-4 py-3 md:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src="/images/logo.jpg" alt="Twin Stars Day Care Logo" className="h-14 w-auto rounded-xl shadow-sm" />
            <div className="hidden sm:block">
              <h1 className="font-display font-black text-xl leading-tight text-foreground">
                Twin Stars
              </h1>
              <p className="text-xs text-muted-foreground font-body font-medium">Day Care & After Care</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-2 rounded-full text-sm font-bold font-body transition-all duration-200
                  ${location.pathname === link.to
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={session ? '/dashboard' : '/auth'}
              className="ml-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-display font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all inline-flex items-center gap-2"
            >
              {session ? <><LayoutDashboard className="w-4 h-4" />Dashboard</> : <>Sign in</>}
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav className="lg:hidden border-t border-border bg-card px-4 py-4 animate-fade-in">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-xl text-base font-bold font-body transition-colors
                  ${location.pathname === link.to
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="block mt-3 px-4 py-3 bg-primary text-primary-foreground rounded-full font-display font-bold text-center"
            >
              Connect With Us →
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
