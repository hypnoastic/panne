import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import Button from './Button';
import OTPVerification from './OTPVerification';

export default function ForgotPassword({ onBack, onSuccess }) {
  const [step, setStep] = useState('email'); // 'email', 'otp', 'reset', 'success'
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  const sendResetOTPMutation = useMutation({
    mutationFn: authApi.sendResetOTP,
    onSuccess: () => {
      setStep('otp');
      setErrors({});
    },
    onError: (error) => {
      setErrors({ general: error.response?.data?.error || 'Failed to send reset code' });
    }
  });

  const verifyResetOTPMutation = useMutation({
    mutationFn: authApi.verifyResetOTP,
    onSuccess: () => {
      setStep('reset');
      setErrors({});
    },
    onError: (error) => {
      setErrors({ general: error.response?.data?.error || 'Invalid reset code' });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      setStep('success');
      setErrors({});
    },
    onError: (error) => {
      setErrors({ general: error.response?.data?.error || 'Failed to reset password' });
    }
  });

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    sendResetOTPMutation.mutate(email);
  };

  const handleOTPVerify = (otp) => {
    verifyResetOTPMutation.mutate({ email, otp });
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors = {};
    if (!newPassword) newErrors.password = 'Password is required';
    if (newPassword.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    resetPasswordMutation.mutate({ email, password: newPassword });
  };

  const handleBackToEmail = () => {
    setStep('email');
    setErrors({});
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'email' && (
        <motion.div
          key="email"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <div className="auth-header">
            <button className="otp-back-btn" onClick={onBack}>
              ←
            </button>
            <h2 className="auth-title">Reset Password</h2>
            <p className="auth-subtitle">
              Enter your email address and we'll send you a reset code.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleEmailSubmit}>
            {errors.general && (
              <div className="auth-error">{errors.general}</div>
            )}

            <div className="form-group">
              <input
                type="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
              />
              {errors.email && (
                <span className="form-error">{errors.email}</span>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={sendResetOTPMutation.isPending}
              className="auth-submit"
            >
              Send Reset Code
            </Button>
          </form>
        </motion.div>
      )}

      {step === 'otp' && (
        <OTPVerification
          key="otp"
          email={email}
          onVerify={handleOTPVerify}
          onBack={handleBackToEmail}
          loading={verifyResetOTPMutation.isPending}
          error={errors.general}
          title="Enter Reset Code"
          subtitle="We've sent a 6-digit code to your email address."
        />
      )}

      {step === 'reset' && (
        <motion.div
          key="reset"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <div className="auth-header">
            <h2 className="auth-title">New Password</h2>
            <p className="auth-subtitle">
              Enter your new password below.
            </p>
          </div>

          <form className="auth-form" onSubmit={handlePasswordReset}>
            {errors.general && (
              <div className="auth-error">{errors.general}</div>
            )}

            <div className="form-group">
              <input
                type="password"
                className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
              />
              {errors.password && (
                <span className="form-error">{errors.password}</span>
              )}
            </div>

            <div className="form-group">
              <input
                type="password"
                className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
              />
              {errors.confirmPassword && (
                <span className="form-error">{errors.confirmPassword}</span>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={resetPasswordMutation.isPending}
              className="auth-submit"
            >
              Reset Password
            </Button>
          </form>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <div className="auth-header">
            <h2 className="auth-title">Password Reset Successfully!</h2>
            <p className="auth-subtitle">
              Your password has been updated successfully.
            </p>
          </div>

          <div className="auth-success">
            Please login with your new password.
          </div>

          <Button
            size="lg"
            onClick={() => onSuccess?.()}
            className="auth-submit"
          >
            Back to Login
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}