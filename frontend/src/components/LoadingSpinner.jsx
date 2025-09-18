import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'md' }) {
  return (
    <div className={`loading-spinner loading-spinner--${size}`}>
      <div className="loading-spinner__circle"></div>
    </div>
  );
}