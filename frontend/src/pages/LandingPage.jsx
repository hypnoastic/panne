import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Button from '../components/Button';
import docsImage from '../assets/docs.webp';
import journalImage from '../assets/journal.webp';
import researchImage from '../assets/research.webp';
import thoughtsImage from '../assets/thoughts.webp';
import leftImage from '../assets/left.png';
import rightImage from '../assets/right.png';
import arrowImage from '../assets/arrow.png';
import infoImage from '../assets/info.png';
import './LandingPage.css';

export default function LandingPage() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 5;

  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (slideNumber) => {
    setCurrentSlide(slideNumber);
  };

  const handleNavClick = (slideNumber) => {
    setCurrentSlide(slideNumber);
  };

  useEffect(() => {
    let isScrolling = false;
    let deltaY = 0;
    let deltaX = 0;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    
    const handleWheel = (e) => {
      e.preventDefault();
      
      if (isScrolling) return;
      
      deltaY += e.deltaY;
      deltaX += e.deltaX;
      
      const threshold = 800;
      
      if (Math.abs(deltaY) > threshold || Math.abs(deltaX) > threshold) {
        isScrolling = true;
        
        if (deltaY > threshold || deltaX > threshold) {
          nextSlide();
        } else if (deltaY < -threshold || deltaX < -threshold) {
          prevSlide();
        }
        
        deltaY = 0;
        deltaX = 0;
        
        setTimeout(() => {
          isScrolling = false;
        }, 100);
      }
      
      setTimeout(() => {
        deltaY = 0;
        deltaX = 0;
      }, 100);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [currentSlide]);

  return (
    <div className="landingpage-landing-page">
      {/* Fixed Background */}
      <div className="landingpage-fixed-background"></div>
      
      {/* Navigation Arrows */}
      <div className="landingpage-nav-arrows">
        <button 
          className="landingpage-nav-arrow landingpage-left" 
          onClick={prevSlide}
          disabled={currentSlide === 1}
        >
          <img src={arrowImage} alt="Previous" />
        </button>
        <button 
          className="landingpage-nav-arrow landingpage-right" 
          onClick={nextSlide}
          disabled={currentSlide === totalSlides}
        >
          <img src={arrowImage} alt="Next" />
        </button>
      </div>
      
      {/* Slide Dots */}
      <div className="landingpage-slide-dots">
        {[1, 2, 3, 4, 5].map((slide) => (
          <div 
            key={slide}
            className={`landingpage-slide-dot ${currentSlide === slide ? 'landingpage-active' : ''}`}
            onClick={() => goToSlide(slide)}
          />
        ))}
      </div>
      {/* Floating Navigation */}
      <motion.header 
        className="landingpage-floating-nav"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="landingpage-nav-content">
          <div className="landingpage-nav-logo">
            <button onClick={() => handleNavClick(1)} style={{background: 'none', border: 'none'}}>
              <h1>Panne</h1>
            </button>
          </div>
          <nav className="landingpage-nav-links">
            <button onClick={() => handleNavClick(2)} className="landingpage-nav-link">Features</button>
            <button onClick={() => handleNavClick(3)} className="landingpage-nav-link">About</button>
            <button onClick={() => handleNavClick(4)} className="landingpage-nav-link">Testimonials</button>
            <button onClick={() => handleNavClick(5)} className="landingpage-nav-link">Contact</button>
          </nav>
          <div className="landingpage-nav-auth">
            <Link to="/login" className="landingpage-nav-link">
              {t('auth.login')}
            </Link>
            <Link to="/register">
              <Button size="sm">{t('auth.register')}</Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Sections Container */}
      <div className={`landingpage-sections-container landingpage-slide-${currentSlide}`}>
        {/* Hero Section */}
        <section className="landingpage-hero-section" id="home">
        <div className="landingpage-hero-content">
          <motion.div
            className="landingpage-hero-text"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >

            <h1 className="landingpage-hero-title">What will you <span className="landingpage-green-text">Achieve</span> today?</h1>
            <p className="landingpage-hero-tagline">Remember everything and tackle any project with your notes, tasks, and schedule all in one place.</p>
            <div className="landingpage-hero-actions">
              <Link to="/register">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">Sign In</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landingpage-features-section" id="features">
        <div className="landingpage-section-glass">
          <h2 className="landingpage-section-title">Features</h2>
          <div className="landingpage-features-grid">
            <div className="landingpage-feature-card">
              <div className="landingpage-feature-image">
                <img src={docsImage} alt="Feature" />
              </div>
            </div>
            <div className="landingpage-feature-card">
              <div className="landingpage-feature-image">
                <img src={journalImage} alt="Feature" />
              </div>
            </div>
            <div className="landingpage-feature-card">
              <div className="landingpage-feature-image">
                <img src={researchImage} alt="Feature" />
              </div>
            </div>
            <div className="landingpage-feature-card">
              <div className="landingpage-feature-image">
                <img src={thoughtsImage} alt="Feature" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="landingpage-about-section" id="about">
        <div className="landingpage-section-glass">
          <h2 className="landingpage-section-title">About Panne</h2>
          <div className="landingpage-about-content">
            <div className="landingpage-about-image landingpage-left">
              <img src={rightImage} alt="About" />
            </div>
            <div className="landingpage-about-text">
              <p>
                Panne is an intelligent, fluid, and reliable digital workspace that combines 
                real-time collaboration with AI-powered assistance. Built with modern web 
                technologies, it provides a seamless experience for creating, editing, and 
                sharing documents with advanced features like version control, real-time 
                collaboration, and AI integration.
              </p>
              <p>
                Our platform leverages cutting-edge technologies including React, Node.js, 
                PostgreSQL, and Google Gemini AI to deliver unparalleled performance and 
                user experience. Whether you're working solo or with a team, Panne adapts 
                to your workflow and enhances your productivity.
              </p>
            </div>
            <div className="landingpage-about-image landingpage-right">
              <img src={leftImage} alt="About" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="landingpage-testimonials-section" id="testimonials">
        <div className="landingpage-section-glass">
          <h2 className="landingpage-section-title">What Our Users Say</h2>
          <div className="landingpage-testimonials-grid">
            <div className="landingpage-testimonial-card">
              <div className="landingpage-testimonial-header">
                <div className="landingpage-testimonial-avatar">SJ</div>
                <div className="landingpage-testimonial-info">
                  <h4>Sarah Johnson</h4>
                  <p className="landingpage-role">CEO at TechCorp</p>
                </div>
              </div>
              <div className="landingpage-testimonial-rating">
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
              </div>
              <p>"Panne has revolutionized our team collaboration. The AI assistance is incredible and has streamlined our workflow beyond expectations. Our productivity has increased significantly since implementation."</p>
              <div className="landingpage-testimonial-footer">
                <span className="landingpage-testimonial-date">2 weeks ago</span>
                <span>Verified Purchase</span>
              </div>
            </div>
            <div className="landingpage-testimonial-card">
              <div className="landingpage-testimonial-header">
                <div className="landingpage-testimonial-avatar">MC</div>
                <div className="landingpage-testimonial-info">
                  <h4>Mike Chen</h4>
                  <p className="landingpage-role">Senior Developer</p>
                </div>
              </div>
              <div className="landingpage-testimonial-rating">
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
              </div>
              <p>"The real-time editing features are seamless. Best collaboration tool we've used. The version control system is intuitive and the AI suggestions are spot-on for our development needs."</p>
              <div className="landingpage-testimonial-footer">
                <span className="landingpage-testimonial-date">1 month ago</span>
                <span>Verified Purchase</span>
              </div>
            </div>
            <div className="landingpage-testimonial-card">
              <div className="landingpage-testimonial-header">
                <div className="landingpage-testimonial-avatar">LW</div>
                <div className="landingpage-testimonial-info">
                  <h4>Lisa Wang</h4>
                  <p className="landingpage-role">UX Designer</p>
                </div>
              </div>
              <div className="landingpage-testimonial-rating">
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
                <span className="landingpage-star">★</span>
              </div>
              <p>"Version control and AI suggestions have improved our productivity by 300%. The interface is beautiful and the collaborative features make remote work feel seamless and connected."</p>
              <div className="landingpage-testimonial-footer">
                <span className="landingpage-testimonial-date">3 weeks ago</span>
                <span>Verified Purchase</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="landingpage-contact-section" id="contact">
        <div className="landingpage-section-glass">
          <h2 className="landingpage-section-title">Contact Us</h2>
          <div className="landingpage-contact-content">
            <div className="landingpage-contact-info">
              <div className="landingpage-contact-info-icon">
                <img src={infoImage} alt="Contact Info" />
              </div>
              <p>Ready to transform your collaboration experience?</p>
              <a href="mailto:hello@panne.com" className="landingpage-contact-email">
                hello@panne.com
              </a>
            </div>
            <div className="landingpage-contact-form-container">
              <form className="landingpage-contact-form">
                <div className="landingpage-form-group">
                  <input type="text" className="landingpage-form-input" placeholder="Your Name" />
                  <input type="email" className="landingpage-form-input" placeholder="Your Email" />
                </div>
                <input type="text" className="landingpage-form-input" placeholder="Subject" />
                <textarea className="landingpage-form-textarea" placeholder="Your Message"></textarea>
              </form>
              <div className="landingpage-contact-actions">
                <Button size="lg">Send Message</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}