import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n';

const Footer = () => {
  const { locale, t } = useTranslation();

  return (
    <footer className="site-footer">
      <div className="container">

        {/* TOP — Editorial Closing Headline & CTAs */}
        <div className="footer-top-editorial">
          <h3 className="footer-closing-headline">
            {t('footer.headline')}
          </h3>
          <div className="footer-top-actions">
            <Link to="/marketplace" className="btn btn-primary btn-md">
              {t('navbar.services')}
            </Link>
            <Link to="/register?role=freelancer" className="btn btn-outline btn-md">
              {t('navbar.becomeFreelancer')}
            </Link>
          </div>
        </div>

        <div className="footer-divider" />

        {/* MIDDLE — Navigation Columns */}
        <div className="footer-nav-grid">

          {/* Col 1 — Marketplace */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">Marketplace</h4>
            <ul className="footer-links-list">
              <li><Link to="/marketplace" className="footer-link">{t('navbar.services')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/marketplace" className="footer-link">{t('navbar.categories')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/marketplace" className="footer-link">Freelancers <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/marketplace" className="footer-link">Explore Gigs <ArrowUpRight size={11} className="link-arrow" /></Link></li>
            </ul>
          </div>

          {/* Col 2 — For Buyers */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">For Buyers</h4>
            <ul className="footer-links-list">
              <li><Link to="/post-project" className="footer-link">{t('navbar.postProject')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/marketplace" className="footer-link">How It Works <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/buyer" className="footer-link">{t('navbar.savedServices')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/buyer" className="footer-link">{t('navbar.myOrders')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
            </ul>
          </div>

          {/* Col 3 — For Freelancers */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">For Freelancers</h4>
            <ul className="footer-links-list">
              <li><Link to="/register?role=freelancer" className="footer-link">{t('navbar.becomeFreelancer')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/seller" className="footer-link">Create a Service <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/seller" className="footer-link">{t('navbar.dashboard')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/principles" className="footer-link">{t('navbar.principles')} <ArrowUpRight size={11} className="link-arrow" /></Link></li>
            </ul>
          </div>

          {/* Col 4 — Company */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links-list">
              <li><Link to="/" className="footer-link">About WorkStream <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/" className="footer-link">Contact Support <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/" className="footer-link">Terms of Service <ArrowUpRight size={11} className="link-arrow" /></Link></li>
              <li><Link to="/" className="footer-link">Privacy Policy <ArrowUpRight size={11} className="link-arrow" /></Link></li>
            </ul>
          </div>

        </div>

        <div className="footer-divider" />

        {/* BOTTOM — Copyright, Socials, Currency */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            <Link to="/" className="footer-brand-logo">Work<span>Stream</span></Link>
            <span>&copy; {new Date().getFullYear()} {t('footer.copyright')}</span>
          </div>

          <div className="footer-social-links">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="footer-social-item">Twitter</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="footer-social-item">GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="footer-social-item">LinkedIn</a>
            <a href="https://dribbble.com" target="_blank" rel="noreferrer" className="footer-social-item">Dribbble</a>
          </div>

          <div className="footer-locale-pill">
            <span>{locale === 'en' ? 'English' : 'हिन्दी'}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ color: 'var(--color-accent)' }}>₹ INR</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
