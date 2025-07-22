// Loading Screen Animation
window.addEventListener('load', () => {
    const loadingScreen = document.querySelector('.cyber-loading');
    const progressBar = document.querySelector('.progress-bar-cyber');
    const loadingPercent = document.getElementById('loading-percent');
    const loadingStatus = document.querySelector('.loading-status');
    
    const statusMessages = [
        'INITIALIZING SYSTEMS...',
        'LOADING NEURAL NETWORKS...',
        'CONNECTING TO DATABASE...',
        'OPTIMIZING ALGORITHMS...',
        'SYSTEM READY!'
    ];
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        loadingPercent.textContent = Math.floor(progress) + '%';
        
        const statusIndex = Math.floor((progress / 100) * statusMessages.length);
        if (statusMessages[statusIndex]) {
            loadingStatus.textContent = statusMessages[statusIndex];
        }
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    initializeAnimations();
                }, 500);
            }, 1000);
        }
    }, 100);
});

// Cyber Cursor
const cursor = document.querySelector('.cyber-cursor');
const cursorCore = document.querySelector('.cursor-core');
const cursorRing = document.querySelector('.cursor-ring');

if (cursor && window.innerWidth > 768) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .cyber-btn, .tab-btn');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorRing.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursorCore.style.background = '#ff0041';
        });
        
        el.addEventListener('mouseleave', () => {
            cursorRing.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorCore.style.background = '#00ff41';
        });
    });
}

// Advanced Typewriter Effect
const typewriterTexts = [
    'AI ENGINEER',
    'DATA SCIENTIST', 
    'ML SPECIALIST',
    'NEURAL ARCHITECT',
    'DATA WIZARD'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typeSpeed = 150;

function typeWriter() {
    const typedTextElement = document.querySelector('.typed-text');
    if (!typedTextElement) return;

    const currentText = typewriterTexts[textIndex];
    
    if (isDeleting) {
        typedTextElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
        typeSpeed = 50;
    } else {
        typedTextElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
        typeSpeed = 150;
    }

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

// Counter Animation
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const speed = target / 100;
        let count = 0;
        
        const updateCounter = () => {
            if (count < target) {
                count += speed;
                counter.textContent = Math.ceil(count);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
                if (target === 100) {
                    counter.textContent = target + '%';
                }
            }
        };
        
        updateCounter();
    });
}

// Skill Bar Animation
function animateSkillBars() {
    const skillFills = document.querySelectorAll('.skill-fill');
    skillFills.forEach((fill, index) => {
        setTimeout(() => {
            const skillValue = fill.getAttribute('data-skill');
            fill.style.width = skillValue + '%';
        }, index * 200);
    });
}

// Tab System
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Animate skill bars if skills tab
            if (targetTab === 'skills') {
                setTimeout(animateSkillBars, 100);
            }
        });
    });
}

// Mobile Menu
function initMobileMenu() {
    const menuToggle = document.querySelector('.cyber-menu');
    const nav = document.querySelector('.cyber-nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('open');
            menuToggle.classList.toggle('active');
        });
        
        // Close menu when clicking nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                menuToggle.classList.remove('active');
            });
        });
    }
}

// Smooth Scrolling
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
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
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                
                // Animate counters when hero section is visible
                if (entry.target.classList.contains('hero-stats')) {
                    animateCounters();
                }
            }
        });
    }, observerOptions);

    // Observe elements for scroll animations
    const animateElements = document.querySelectorAll('.hero-content, .hero-visual, .about-grid, .projects-grid, .contact-container');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(50px)';
        el.style.transition = 'all 0.8s ease';
        observer.observe(el);
    });
}

// Parallax Effects
function initParallax() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.float-item');
        
        parallaxElements.forEach((element, index) => {
            const speed = (index + 1) * 0.5;
            element.style.transform = `translateY(${scrolled * speed * 0.1}px) rotate(${scrolled * 0.05}deg)`;
        });
    });
}

// Form Enhancement
function initForm() {
    const form = document.querySelector('.cyber-form');
    const inputs = document.querySelectorAll('.form-group input, .form-group textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            if (input.value === '') {
                input.parentElement.classList.remove('focused');
            }
        });
        
        // Add glow effect on typing
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                input.style.borderColor = '#00ff41';
                input.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';
            } else {
                input.style.borderColor = '#333333';
                input.style.boxShadow = 'none';
            }
        });
    });
}

// Particle System Enhancement
function createAdditionalParticles() {
    const particleContainer = document.querySelector('.data-particles');
    if (!particleContainer) return;
    
    const additionalParticles = ['TENSOR', 'MATRIX', 'VECTOR', 'NEURAL', 'ALGO'];
    
    additionalParticles.forEach((text, index) => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.setAttribute('data-value', text);
        particle.textContent = text;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = (index * 3 + 15) + 's';
        particleContainer.appendChild(particle);
    });
}

// Audio Feedback (Optional)
function addAudioFeedback() {
    // Create audio context for button sounds
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    
    function playTone(frequency, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }
    
    // Add sound to buttons
    document.querySelectorAll('.cyber-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            playTone(800, 0.1);
        });
        
        btn.addEventListener('click', () => {
            playTone(1000, 0.2);
        });
    });
}

// Matrix Rain Effect (Background)
function createMatrixRain() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-2';
    canvas.style.opacity = '0.1';
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = '01';
    const matrix = chars.split('');
    const fontSize = 10;
    const columns = canvas.width / fontSize;
    const drops = [];
    
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }
    
    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff41';
        ctx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const text = matrix[Math.floor(Math.random() * matrix.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(draw, 35);
}

// Initialize Everything
function initializeAnimations() {
    setTimeout(() => {
        typeWriter();
        initTabs();
        initMobileMenu();
        initSmoothScroll();
        initScrollAnimations();
        initParallax();
        initForm();
        createAdditionalParticles();
        // createMatrixRain(); // Uncomment for matrix rain effect
        
        // Optional audio feedback
        // addAudioFeedback(); // Uncomment for sound effects
        
        console.log('🚀 CYBER PORTFOLIO FULLY LOADED!');
    }, 100);
}

// Handle window resize
window.addEventListener('resize', () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// Error Handling
window.addEventListener('error', (e) => {
    console.error('Portfolio Error:', e.error);
});

// Performance Monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log(`⚡ Page loaded in ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
        }, 0);
    });
}
