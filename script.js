const navLinks = document.querySelector('.nav-links');
const menuToggle = document.querySelector('.menu-toggle');
const backToTop = document.querySelector('.back-to-top');
const yearEl = document.getElementById('current-year');
const animatedElements = document.querySelectorAll('[data-animate]');

const toggleNavigation = () => {
    navLinks.classList.toggle('open');
    menuToggle.classList.toggle('active');
};

const closeNavigation = () => {
    navLinks.classList.remove('open');
    menuToggle.classList.remove('active');
};

menuToggle?.addEventListener('click', toggleNavigation);

navLinks?.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => {
        closeNavigation();
        navLinks.querySelectorAll('a').forEach(navItem => navItem.classList.remove('active'));
        link.classList.add('active');
    })
);

const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -60px 0px'
};

const animateOnScroll = entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
};

const observer = new IntersectionObserver(animateOnScroll, observerOptions);

animatedElements.forEach(element => observer.observe(element));

window.addEventListener('scroll', () => {
    if (window.scrollY > 250) {
        backToTop.style.display = 'flex';
    } else {
        backToTop.style.display = 'none';
    }
});

backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
}
