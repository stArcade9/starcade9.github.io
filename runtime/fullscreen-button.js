// Fullscreen button for Nova64
// Creates a UI button in the lower-right corner to toggle fullscreen mode

export class FullscreenButton {
  constructor(canvas) {
    this.canvas = canvas;
    this.button = null;
    this.isFullscreen = false;
    this.createButton();
    this.attachListeners();
  }

  createButton() {
    // Create button element
    this.button = document.createElement('button');
    this.button.id = 'nova64-fullscreen-btn';
    this.button.innerHTML = this.getExpandIcon();
    this.button.title = 'Toggle Fullscreen (ESC to exit)';
    
    // Style the button
    Object.assign(this.button.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '48px',
      height: '48px',
      borderRadius: '8px',
      border: '2px solid #00ffff',
      background: 'rgba(21, 24, 34, 0.9)',
      color: '#00ffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      zIndex: '9999',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5)',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    });

    // Hover effect
    this.button.addEventListener('mouseenter', () => {
      this.button.style.background = 'rgba(0, 255, 255, 0.2)';
      this.button.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6), 0 4px 16px rgba(0, 0, 0, 0.6)';
      this.button.style.transform = 'scale(1.1)';
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.style.background = 'rgba(21, 24, 34, 0.9)';
      this.button.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5)';
      this.button.style.transform = 'scale(1)';
    });

    // Add to document
    document.body.appendChild(this.button);
  }

  getExpandIcon() {
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    `;
  }

  getCompressIcon() {
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>
    `;
  }

  attachListeners() {
    // Click to toggle fullscreen
    this.button.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // ESC key to exit fullscreen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isFullscreen) {
        this.exitFullscreen();
      }
    });

    // Listen for fullscreen changes (handles F11, ESC, etc.)
    document.addEventListener('fullscreenchange', () => {
      this.handleFullscreenChange();
    });
    document.addEventListener('webkitfullscreenchange', () => {
      this.handleFullscreenChange();
    });
    document.addEventListener('mozfullscreenchange', () => {
      this.handleFullscreenChange();
    });
    document.addEventListener('MSFullscreenChange', () => {
      this.handleFullscreenChange();
    });
  }

  toggleFullscreen() {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  enterFullscreen() {
    const elem = this.canvas;
    
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) { // IE11
      elem.msRequestFullscreen();
    }
    
    this.isFullscreen = true;
    this.updateButton();
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { // Safari
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) { // IE11
      document.msExitFullscreen();
    }
    
    this.isFullscreen = false;
    this.updateButton();
  }

  handleFullscreenChange() {
    // Check if we're actually in fullscreen
    const isInFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    this.isFullscreen = isInFullscreen;
    this.updateButton();
  }

  updateButton() {
    if (this.isFullscreen) {
      this.button.innerHTML = this.getCompressIcon();
      this.button.title = 'Exit Fullscreen (ESC)';
    } else {
      this.button.innerHTML = this.getExpandIcon();
      this.button.title = 'Toggle Fullscreen (ESC to exit)';
    }
  }

  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }
}

// Export factory function
export function createFullscreenButton(canvas) {
  return new FullscreenButton(canvas);
}
