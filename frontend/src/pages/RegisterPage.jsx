import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Lottie from 'lottie-react';
import { authApi } from '../services/api';
import Button from '../components/Button';
import GoogleAuth from '../components/GoogleAuth';
import OTPVerification from '../components/OTPVerification';
import signupAnimation from '../assets/signup.json';
import './AuthPage.css';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState('register'); // 'register' or 'otp'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const sendOTPMutation = useMutation({
    mutationFn: authApi.sendOTP,
    onSuccess: () => {
      setStep('otp');
      setErrors({});
    },
    onError: (error) => {
      setErrors({ general: error.response?.data?.error || 'Failed to send OTP' });
    }
  });

  const verifyOTPMutation = useMutation({
    mutationFn: authApi.verifyOTP,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate('/dashboard');
    },
    onError: (error) => {
      setErrors({ general: error.response?.data?.error || 'Invalid OTP' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    
    // Validation
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    sendOTPMutation.mutate(formData.email);
  };

  const handleOTPVerify = (otp) => {
    const { confirmPassword, ...submitData } = formData;
    verifyOTPMutation.mutate({ ...submitData, otp });
  };

  const handleBackToRegister = () => {
    setStep('register');
    setErrors({});
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
        <div className="auth-content register-content">
          <div className="auth-form-container">
            <motion.div
              className="auth-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {step === 'register' && (
                <div className="auth-header">
                  <h2 className="auth-title">{t('auth.register')}</h2>
                  <p className="auth-subtitle">
                    Create your account to get started.
                  </p>
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 'register' ? (
                  <motion.form
                    key="register"
                    className="auth-form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
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
                        type="text"
                        id="name"
                        name="name"
                        className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Full Name"
                      />
                      {errors.name && (
                        <span className="form-error">{errors.name}</span>
                      )}
                    </div>

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

                    <div className="form-group">
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm Password"
                      />
                      {errors.confirmPassword && (
                        <span className="form-error">{errors.confirmPassword}</span>
                      )}
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      loading={sendOTPMutation.isPending}
                      className="auth-submit"
                    >
                      Send Verification Code
                    </Button>

                    <div className="auth-divider">
                    </div>

                    <GoogleAuth />
                  </motion.form>
                ) : (
                  <OTPVerification
                    key="otp"
                    email={formData.email}
                    onVerify={handleOTPVerify}
                    onBack={handleBackToRegister}
                    loading={verifyOTPMutation.isPending}
                    error={errors.general}
                  />
                )}
              </AnimatePresence>

              <div className="auth-footer">
                <p>
                  {t('auth.hasAccount')}{' '}
                  <Link to="/login" className="auth-link">
                    {t('auth.login')}
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            className="auth-lottie-container"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="auth-lottie">
              <Lottie animationData={signupAnimation} loop={true} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}