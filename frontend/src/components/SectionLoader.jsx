import Lottie from 'lottie-react';
import sectionLoaderAnimation from '../assets/section_loader.json';
import './SectionLoader.css';

export default function SectionLoader({ size = 'md', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="section-loader section-loader--fullscreen">
        <div className="section-loader__animation section-loader__animation--fullscreen">
          <Lottie animationData={sectionLoaderAnimation} loop={true} />
        </div>
      </div>
    );
  }

  return (
    <div className={`section-loader section-loader--${size}`}>
      <div className={`section-loader__animation section-loader__animation--${size}`}>
        <Lottie animationData={sectionLoaderAnimation} loop={true} />
      </div>
    </div>
  );
}