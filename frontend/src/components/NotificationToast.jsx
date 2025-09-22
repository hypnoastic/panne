import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NotificationToast.css';

export default function NotificationToast({ notification, onClose }) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const handleClick = () => {
    navigate('/collab');
    onClose();
  };

  if (!notification) return null;

  return (
    <div className={`notification-toast ${isVisible ? 'notification-toast--visible' : ''}`}>
      <div className="notification-toast__content" onClick={handleClick}>
        <div className="notification-toast__icon">
          🤝
        </div>
        <div className="notification-toast__text">
          <div className="notification-toast__title">
            New collaboration request
          </div>
          <div className="notification-toast__message">
            {notification.requesterName} wants to access "{notification.noteTitle}"
          </div>
        </div>
        <button 
          className="notification-toast__close"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}