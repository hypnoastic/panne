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
import l1Image from '../assets/l1.png';
import l2Image from '../assets/l2.png';
import l3Image from '../assets/l3.png';
import l4Image from '../assets/l4.png';
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
    <div className="landing-page">
      {/* Fixed Background */}
      <div className="fixed-background"></div>
      
      {/* Navigation Arrows */}
      <div className="nav-arrows">
        <button 
          className="nav-arrow left" 
          onClick={prevSlide}
          disabled={currentSlide === 1}
        >
          <img src={arrowImage} alt="Previous" />
        </button>
        <button 
          className="nav-arrow right" 
          onClick={nextSlide}
          disabled={currentSlide === totalSlides}
        >
          <img src={arrowImage} alt="Next" />
        </button>
      </div>
      
      {/* Slide Dots */}
      <div className="slide-dots">
        {[1, 2, 3, 4, 5].map((slide) => (
          <div 
            key={slide}
            className={`slide-dot ${currentSlide === slide ? 'active' : ''}`}
            onClick={() => goToSlide(slide)}
          />
        ))}
      </div>
      {/* Floating Navigation */}
      <motion.header 
        className="floating-nav"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="nav-content">
          <div className="nav-logo">
            <button onClick={() => handleNavClick(1)} style={{background: 'none', border: 'none'}}>
              <h1>Panne</h1>
            </button>
          </div>
          <nav className="nav-links">
            <button onClick={() => handleNavClick(2)} className="nav-link">Features</button>
            <button onClick={() => handleNavClick(3)} className="nav-link">About</button>
            <button onClick={() => handleNavClick(4)} className="nav-link">Testimonials</button>
            <button onClick={() => handleNavClick(5)} className="nav-link">Contact</button>
          </nav>
          <div className="nav-auth">
            <Link to="/login" className="nav-link">
              {t('auth.login')}
            </Link>
            <Link to="/register">
              <Button size="sm">{t('auth.register')}</Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Sections Container */}
      <div className={`sections-container slide-${currentSlide}`}>
        {/* Hero Section */}
        <section className="hero-section" id="home">
        <div className="hero-content">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >

            <h1 className="hero-title">What will you <span className="green-text">Achieve</span> today?</h1>
            <p className="hero-tagline">Remember everything and tackle any project with your notes, tasks, and schedule all in one place.</p>
            <div className="hero-actions">
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
      <section className="features-section" id="features">
        <div className="section-glass">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-image">
                <img src={docsImage} alt="Feature" />
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-image">
                <img src={journalImage} alt="Feature" />
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-image">
                <img src={researchImage} alt="Feature" />
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-image">
                <img src={thoughtsImage} alt="Feature" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="about">
        <div className="section-glass">
          <h2 className="section-title">About Panne</h2>
          <div className="about-content">
            <div className="about-image left">
              <img src={rightImage} alt="About" />
            </div>
            <div className="about-text">
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
            <div className="about-image right">
              <img src={leftImage} alt="About" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-glass">
          <h2 className="section-title">What Our Users Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">SJ</div>
                <div className="testimonial-info">
                  <h4>Sarah Johnson</h4>
                  <p className="role">CEO at TechCorp</p>
                </div>
              </div>
              <div className="testimonial-rating">
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
              </div>
              <p>"Panne has revolutionized our team collaboration. The AI assistance is incredible and has streamlined our workflow beyond expectations. Our productivity has increased significantly since implementation."</p>
              <div className="testimonial-footer">
                <span className="testimonial-date">2 weeks ago</span>
                <span>Verified Purchase</span>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">MC</div>
                <div className="testimonial-info">
                  <h4>Mike Chen</h4>
                  <p className="role">Senior Developer</p>
                </div>
              </div>
              <div className="testimonial-rating">
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
              </div>
              <p>"The real-time editing features are seamless. Best collaboration tool we've used. The version control system is intuitive and the AI suggestions are spot-on for our development needs."</p>
              <div className="testimonial-footer">
                <span className="testimonial-date">1 month ago</span>
                <span>Verified Purchase</span>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">LW</div>
                <div className="testimonial-info">
                  <h4>Lisa Wang</h4>
                  <p className="role">UX Designer</p>
                </div>
              </div>
              <div className="testimonial-rating">
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
              </div>
              <p>"Version control and AI suggestions have improved our productivity by 300%. The interface is beautiful and the collaborative features make remote work feel seamless and connected."</p>
              <div className="testimonial-footer">
                <span className="testimonial-date">3 weeks ago</span>
                <span>Verified Purchase</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section" id="contact">
        <div className="section-glass">
          <h2 className="section-title">Contact Us</h2>
          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-info-icon">
                <img src={infoImage} alt="Contact Info" />
              </div>
              <p>Ready to transform your collaboration experience?</p>
              <a href="mailto:hello@panne.com" className="contact-email">
                hello@panne.com
              </a>
            </div>
            <div className="contact-form-container">
              <form className="contact-form">
                <div className="form-group">
                  <input type="text" className="form-input" placeholder="Your Name" />
                  <input type="email" className="form-input" placeholder="Your Email" />
                </div>
                <input type="text" className="form-input" placeholder="Subject" />
                <textarea className="form-textarea" placeholder="Your Message"></textarea>
              </form>
              <div className="contact-actions">
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