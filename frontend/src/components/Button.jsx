import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const buttonClass = `
    button 
    button--${variant} 
    button--${size} 
    ${loading || disabled ? 'button--disabled' : ''}
    ${className}
  `.trim();

  return (
    <motion.button
      className={buttonClass}
      disabled={loading || disabled}
      whileHover={!loading && !disabled ? { scale: 1.02 } : {}}
      whileTap={!loading && !disabled ? { scale: 0.98 } : {}}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      <span className={loading ? 'button__text--loading' : ''}>
        {children}
      </span>
    </motion.button>
  );
}
