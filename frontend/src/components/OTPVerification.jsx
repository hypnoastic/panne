import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';

export default function OTPVerification({ email, onVerify, onBack, loading, error, title = 'Verify Your Email', subtitle }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (index, value) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value) || value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.querySelector(`#otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`#otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length === 6) {
      onVerify(otpString);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="auth-header">
        <button 
          className="otp-back-btn" 
          onClick={onBack}
          disabled={loading}
        >
          ←
        </button>
        <h2 className="auth-title">{title}</h2>
        <p className="auth-subtitle">
          {subtitle || (
            <>We've sent a 6-digit code to<br/><strong>{email}</strong></>
          )}
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {error}
          </motion.div>
        )}

        <div className="otp-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="otp-input"
              autoComplete="one-time-code"
            />
          ))}
        </div>

        <div className="otp-timer">
          {timeLeft > 0 ? (
            <span>Code expires in {formatTime(timeLeft)}</span>
          ) : (
            <span className="expired">Code expired</span>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={otp.join('').length !== 6 || timeLeft === 0}
          className="auth-submit"
        >
          Verify
        </Button>
      </form>
    </motion.div>
  );
}