// Particles.js Configuration
document.addEventListener('DOMContentLoaded', () => {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: {
                    value: 80,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: '#2563eb'
                },
                shape: {
                    type: 'circle'
                },
                opacity: {
                    value: 0.5,
                    random: false,
                    anim: {
                        enable: true,
                        speed: 1,
                        opacity_min: 0.2,
                        sync: false
                    }
                },
                size: {
                    value: 3,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 2,
                        size_min: 1,
                        sync: false
                    }
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#2563eb',
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'grab'
                    },
                    onclick: {
                        enable: true,
                        mode: 'push'
                    },
                    resize: true
                },
                modes: {
                    grab: {
                        distance: 140,
                        line_linked: {
                            opacity: 1
                        }
                    },
                    push: {
                        particles_nb: 4
                    }
                }
            },
            retina_detect: true
        });
    }
});

// CV Download Function
function initCVDownload() {
    const downloadBtn = document.querySelector('.btn.primary');
    
    if (downloadBtn && downloadBtn.textContent.includes('Download CV')) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Try multiple methods to ensure download works
            try {
                // Method 1: Direct download
                const link = document.createElement('a');
                link.href = 'images/Resume.pdf';
                link.download = 'Aman_Tripathi_CV.pdf';
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('CV download initiated');
            } catch (error) {
                // Method 2: Fallback - open in new tab
                console.log('Fallback method used');
                window.open('images/Resume.pdf', '_blank');
            }
        });
    }
}

// Typewriter Effect
const typewriterTexts = [
    'Linear Regression',
    'Logistic Regression',
    'Random Forest',
    'Decision Trees',
    'K-Means Clustering',
    'Hypothesis Testing',
    'A/B Testing',
    'Time Series Analysis',
    'Neural Networks',
    'Deep Learning',
    'Natural Language Processing',
    'Support Vector Machines',
    'Gradient Boosting',
    'Feature Engineering',
    'Cross Validation',
    'P-Values & Significance',
    'Correlation Analysis',
    'ANOVA',
    'Chi-Square Test',
    'Bayesian Statistics'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeWriter() {
    const typedTextElement = document.querySelector('.typed-text');
    if (!typedTextElement) return;

    const currentText = typewriterTexts[textIndex];
    
    if (isDeleting) {
        typedTextElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typedTextElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 50 : 150;

    if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % typewriterTexts.length;
        typeSpeed = 500;
    }

    setTimeout(typeWriter, typeSpeed);
}

// Skills Animation - Not needed for card-based skills
function animateSkills() {
    // Card-based skills don't need bar animation
    return;
}

// Tab System
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Mobile Menu
function initMobileMenu() {
    const menuIcon = document.querySelector('#menu-icon');
    const navlist = document.querySelector('.navlist');
    
    if (menuIcon && navlist) {
        menuIcon.addEventListener('click', () => {
            navlist.classList.toggle('open');
            menuIcon.classList.toggle('bx-x');
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navlist.classList.remove('open');
                menuIcon.classList.remove('bx-x');
            });
        });
    }
}

// Smooth Scrolling & Active Menu
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');
    
    // Smooth scrolling
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Active menu highlighting
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.skill-card, .project-card').forEach(el => {
        observer.observe(el);
    });
}

// Float Cards Interaction
function initFloatCards() {
    const floatCards = document.querySelectorAll('.float-card');
    
    floatCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.animationPlayState = 'paused';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.animationPlayState = 'running';
        });
        
        card.addEventListener('click', () => {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        });
    });
}

// Enhanced File Check Function
function checkFileExists(url) {
    return new Promise((resolve) => {
        fetch(url, { method: 'HEAD' })
            .then(response => resolve(response.ok))
            .catch(() => resolve(false));
    });
}

// Alternative CV Download with File Check
async function initAdvancedCVDownload() {
    const downloadBtn = document.querySelector('.btn.primary');
    
    if (downloadBtn && downloadBtn.textContent.includes('Download CV')) {
        // Check if CV file exists
        const fileExists = await checkFileExists('images/Resume.pdf');
        
        if (!fileExists) {
            console.warn('CV file not found at images/Resume.pdf');
            // You could show a message to user or use alternative method
        }
        
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (fileExists) {
                // File exists, proceed with download
                const link = document.createElement('a');
                link.href = 'images/Resume.pdf';
                link.download = 'Aman_Tripathi_CV.pdf';
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('✅ CV download successful');
            } else {
                // File doesn't exist, show error or use alternative
                console.log('❌ CV file not found');
                alert('CV file is currently unavailable. Please try again later.');
            }
        });
    }
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        typeWriter();
        initTabs();
        initMobileMenu();
        initNavigation();
        initScrollAnimations();
        initFloatCards();
        initPaperViewer();
        initProjectModal();
        
        // Initialize CV download functionality
        initCVDownload();
        // Or use the advanced version:
        // initAdvancedCVDownload();
        
        console.log('🚀 Portfolio loaded successfully!');
    }, 100);
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const navlist = document.querySelector('.navlist');
        const menuIcon = document.querySelector('#menu-icon');
        
        if (navlist) navlist.classList.remove('open');
        if (menuIcon) menuIcon.classList.remove('bx-x');
    }
});

// Debug helper - check if all elements are loaded
function debugPortfolio() {
    console.log('=== Portfolio Debug Info ===');
    console.log('Particles loaded:', typeof particlesJS !== 'undefined');
    console.log('Download button found:', !!document.querySelector('.btn.primary'));
    console.log('Float cards found:', document.querySelectorAll('.float-card').length);
    console.log('Navigation links:', document.querySelectorAll('.nav-link').length);
    console.log('=== End Debug ===');
}

// Uncomment to run debug
// setTimeout(debugPortfolio, 2000);

// Research Paper Page Turning
function initPaperViewer() {
    const turnBtn = document.querySelector('.turn-btn');
    const book = document.querySelector('.book');
    let isFlipped = false;
    
    if (turnBtn && book) {
        turnBtn.addEventListener('click', () => {
            isFlipped = !isFlipped;
            
            if (isFlipped) {
                book.classList.add('flipped');
                turnBtn.classList.add('flipped');
            } else {
                book.classList.remove('flipped');
                turnBtn.classList.remove('flipped');
            }
        });
    }
}

// Project Modal Functionality
function initProjectModal() {
    const modal = document.getElementById('project-modal');
    const viewDetailsBtn = document.querySelector('.view-details-btn');
    const closeBtn = document.querySelector('.modal-close');
    
    if (viewDetailsBtn && modal && closeBtn) {
        // Open modal
        viewDetailsBtn.addEventListener('click', () => {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        });
        
        // Close modal on close button
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
        });
        
        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            }
        });
    }
}
