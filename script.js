// Particles.js Configuration
document.addEventListener('DOMContentLoaded', () => {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: {
                    value: 100,
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
                    value: 0.6,
                    random: false,
                    anim: {
                        enable: true,
                        speed: 1,
                        opacity_min: 0.3,
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
                    speed: 3,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false,
                    attract: {
                        enable: false,
                        rotateX: 600,
                        rotateY: 1200
                    }
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
                        distance: 200,
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

// Typewriter Effect
const typewriterTexts = [
    'Machine Learning Expert',
    'Data Analytics Specialist',
    'Python Developer',
    'Statistical Analyst',
    'Business Intelligence Consultant',
    'Predictive Modeling Expert'
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

// Skills Animation
function animateSkills() {
    const skillBars = document.querySelectorAll('.skill-progress');
    skillBars.forEach((bar, index) => {
        setTimeout(() => {
            const width = bar.getAttribute('data-width');
            bar.style.width = width + '%';
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
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            if (targetTab === 'skills') {
                setTimeout(animateSkills, 300);
            }
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
                if (entry.target.classList.contains('skills-grid')) {
                    animateSkills();
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.skills-grid').forEach(el => {
        observer.observe(el);
    });
}

// Form Enhancement
function initForm() {
    const inputs = document.querySelectorAll('.contact-form input, .contact-form textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#2563eb';
            input.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.style.borderColor = '#e2e8f0';
                input.style.boxShadow = 'none';
            }
        });
    });
}

// Floating Elements Interaction
function initFloatingElements() {
    const floatItems = document.querySelectorAll('.float-item');
    
    floatItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const text = item.getAttribute('data-text');
            console.log(`Exploring: ${text}`);
        });
        
        item.addEventListener('click', () => {
            item.style.transform = 'scale(1.2)';
            setTimeout(() => {
                item.style.transform = '';
            }, 200);
        });
    });
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        typeWriter();
        initTabs();
        initMobileMenu();
        initNavigation();
        initScrollAnimations();
        initForm();
        initFloatingElements();
        
        console.log('🚀 Portfolio loaded successfully!');
    }, 100);
});

// Handle resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.querySelector('.navlist').classList.remove('open');
        document.querySelector('#menu-icon').classList.remove('bx-x');
    }
});
