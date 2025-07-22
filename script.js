// Neural Loading Animation
window.addEventListener('load', () => {
    const loadingScreen = document.querySelector('.neural-loading');
    
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            initializeNeural();
        }, 800);
    }, 3000);
});

// Neural Canvas Background
function initializeNeuralCanvas() {
    const canvas = document.getElementById('neural-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const nodes = [];
    const maxNodes = 50;
    const connectionDistance = 150;
    
    class NeuralNode {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.5;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${this.opacity})`;
            ctx.fill();
            
            // Glow effect
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    
    // Initialize nodes
    for (let i = 0; i < maxNodes; i++) {
        nodes.push(new NeuralNode());
    }
    
    function drawConnections() {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < connectionDistance) {
                    const opacity = (1 - distance / connectionDistance) * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.strokeStyle = `rgba(0, 255, 136, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        nodes.forEach(node => {
            node.update();
            node.draw();
        });
        
        drawConnections();
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Neural Typewriter Effect
const neuralTexts = [
    'MACHINE_LEARNING_ENGINEER',
    'DATA_ANALYST_SPECIALIST', 
    'AI_RESEARCHER',
    'NEURAL_NETWORK_ARCHITECT',
    'PREDICTIVE_MODELER'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;

function neuralTypewriter() {
    const typedElement = document.querySelector('.typed-output');
    if (!typedElement) return;

    const currentText = neuralTexts[textIndex];
    
    if (isDeleting) {
        typedElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typedElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 30 : 100;

    if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % neuralTexts.length;
        typeSpeed = 500;
    }

    setTimeout(neuralTypewriter, typeSpeed);
}

// Neural Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('section');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navNeural = document.querySelector('.nav-neural');
    
    // Smooth scrolling
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Active section highlighting
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });
    
    // Mobile menu
    if (mobileToggle && navNeural) {
        mobileToggle.addEventListener('click', () => {
            navNeural.classList.toggle('open');
        });
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navNeural.classList.remove('open');
            });
        });
    }
}

// Neural Tabs System
function initializeNeuralTabs() {
    const tabButtons = document.querySelectorAll('.neural-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Animate skill circuits
            if (targetTab === 'skills') {
                setTimeout(animateSkillCircuits, 300);
            }
        });
    });
}

// Skill Circuit Animation
function animateSkillCircuits() {
    const circuits = document.querySelectorAll('.circuit-flow');
    circuits.forEach((circuit, index) => {
        setTimeout(() => {
            const flowValue = circuit.getAttribute('data-flow');
            circuit.style.width = flowValue + '%';
        }, index * 200);
    });
}

// Neural Node Connections
function drawNeuralConnections() {
    const svg = document.querySelector('.neural-connections');
    const nodes = document.querySelectorAll('.node');
    
    if (!svg || nodes.length === 0) return;
    
    svg.innerHTML = '';
    
    const svgRect = svg.getBoundingClientRect();
    
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const node1 = nodes[i].getBoundingClientRect();
            const node2 = nodes[j].getBoundingClientRect();
            
            const x1 = node1.left - svgRect.left + node1.width / 2;
            const y1 = node1.top - svgRect.top + node1.height / 2;
            const x2 = node2.left - svgRect.left + node2.width / 2;
            const y2 = node2.top - svgRect.top + node2.height / 2;
            
            const distance = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
            
            if (distance < 200) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.setAttribute('stroke', '#00ff88');
                line.setAttribute('stroke-width', '1');
                line.setAttribute('opacity', (1 - distance / 200) * 0.5);
                
                svg.appendChild(line);
            }
        }
    }
    
    // Animate connections
    const lines = svg.querySelectorAll('line');
    lines.forEach((line, index) => {
        line.style.animation = `connectionPulse 3s ease-in-out infinite ${index * 0.1}s`;
    });
}

// Node Hover Effects
function initializeNodeEffects() {
    const nodes = document.querySelectorAll('.node');
    nodes.forEach(node => {
        node.addEventListener('mouseenter', () => {
            const skill = node.getAttribute('data-skill');
            console.log(`Neural pathway activated: ${skill}`);
            
            // Add pulse effect to connected nodes
            nodes.forEach(otherNode => {
                if (otherNode !== node) {
                    otherNode.style.opacity = '0.3';
                }
            });
        });
        
        node.addEventListener('mouseleave', () => {
            nodes.forEach(otherNode => {
                otherNode.style.opacity = '1';
            });
        });
    });
}

// Form Neural Effects
function initializeNeuralForm() {
    const inputs = document.querySelectorAll('.input-neural input, .input-neural textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.parentElement.classList.remove('focused');
            }
        });
        
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                input.style.borderColor = '#00ff88';
                input.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.3)';
            } else {
                input.style.borderColor = '#333333';
                input.style.boxShadow = 'none';
            }
        });
    });
}

// Scroll Animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('skills-matrix')) {
                    animateSkillCircuits();
                }
                if (entry.target.classList.contains('brain-nodes')) {
                    setTimeout(drawNeuralConnections, 500);
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.skills-matrix, .brain-nodes').forEach(el => {
        observer.observe(el);
    });
}

// Add CSS animations for connections
const connectionStyles = `
    @keyframes connectionPulse {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.8; }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = connectionStyles;
document.head.appendChild(styleSheet);

// Initialize everything
function initializeNeural() {
    setTimeout(() => {
        initializeNeuralCanvas();
        neuralTypewriter();
        initializeNavigation();
        initializeNeuralTabs();
        initializeNodeEffects();
        initializeNeuralForm();
        initializeScrollAnimations();
        
        // Draw initial neural connections
        setTimeout(drawNeuralConnections, 1000);
        
        console.log('🧠 Neural Interface Online');
    }, 100);
}

// Handle window resize
window.addEventListener('resize', () => {
    setTimeout(drawNeuralConnections, 100);
});
