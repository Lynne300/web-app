document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const header = document.querySelector(".header");
  let lastScroll = 0;

  // Mobile menu toggle
  mobileMenuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
    mobileMenuToggle.querySelector("i").classList.toggle("fa-bars");
    mobileMenuToggle.querySelector("i").classList.toggle("fa-times");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
      navMenu.classList.remove("active");
      mobileMenuToggle.querySelector("i").classList.remove("fa-times");
      mobileMenuToggle.querySelector("i").classList.add("fa-bars");
    }
  });

  // Close menu when clicking nav links
  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
      mobileMenuToggle.querySelector("i").classList.remove("fa-times");
      mobileMenuToggle.querySelector("i").classList.add("fa-bars");
    });
  });

  // Handle header visibility on scroll
  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
      header.classList.remove("scroll-up");
      return;
    }

    if (
      currentScroll > lastScroll &&
      !header.classList.contains("scroll-down")
    ) {
      header.classList.remove("scroll-up");
      header.classList.add("scroll-down");
    } else if (
      currentScroll < lastScroll &&
      header.classList.contains("scroll-down")
    ) {
      header.classList.remove("scroll-down");
      header.classList.add("scroll-up");
    }

    lastScroll = currentScroll;
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      navMenu.classList.remove("active");
      mobileMenuToggle.querySelector("i").classList.remove("fa-times");
      mobileMenuToggle.querySelector("i").classList.add("fa-bars");
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const section = document.querySelector(this.getAttribute("href"));
      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
});
