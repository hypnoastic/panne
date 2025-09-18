import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Lottie from 'lottie-react';
import { authApi } from '../services/api';
import Button from '../components/Button';
import loginAnimation from '../assets/login.json';
import './AuthPage.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate(redirectTo || '/dashboard');
    },
    onError: (error) => {
      setErrors({ general: error.response?.data?.error || 'Login failed' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    
    // Basic validation
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    loginMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo-link">
        <h1>Panne</h1>
      </Link>
      
      <div className="auth-container">
        <div className="auth-content login-content">
          <div className="auth-form-container">
            <motion.div
              className="auth-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="auth-header">
                <h2 className="auth-title">{t('auth.login')}</h2>
                <p className="auth-subtitle">
                  Welcome back! Please sign in to your account.
                </p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
            {errors.general && (
              <motion.div
                className="auth-error"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {errors.general}
              </motion.div>
            )}

            <div className="form-group">
              <input
                type="email"
                id="email"
                name="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
              />
              {errors.email && (
                <span className="form-error">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <input
                type="password"
                id="password"
                name="password"
                className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
              />
              {errors.password && (
                <span className="form-error">{errors.password}</span>
              )}
            </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={loginMutation.isPending}
                  className="auth-submit"
                >
                  {t('auth.login')}
                </Button>
              </form>

              <div className="auth-footer">
                <p>
                  {t('auth.noAccount')}{' '}
                  <Link to="/register" className="auth-link">
                    {t('auth.register')}
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            className="auth-lottie-container"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="auth-lottie">
              <Lottie animationData={loginAnimation} loop={true} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}