document.addEventListener("DOMContentLoaded", () => {
  const passwordValidation = {
    minLength: 8,
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasNumber: /\d/,
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
  };

  // Password toggle functionality
  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", function () {
      const input = this.parentNode.querySelector("input");
      const icon = this.querySelector("i");

      input.type = input.type === "password" ? "text" : "password";
      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");

      // Add focus back to input
      input.focus();
    });
  });

  // Password strength checker
  const passwordInput = document.querySelector('input[name="password"]');
  if (passwordInput) {
    // Create strength meter elements
    const strengthMeter = document.createElement("div");
    strengthMeter.className = "password-strength-meter";
    const strengthBar = document.createElement("div");
    strengthBar.className = "strength-bar";
    strengthMeter.appendChild(strengthBar);

    const feedback = document.createElement("div");
    feedback.className = "password-feedback";

    passwordInput.parentNode.parentNode.appendChild(strengthMeter);
    passwordInput.parentNode.parentNode.appendChild(feedback);

    passwordInput.addEventListener("input", () => {
      const password = passwordInput.value;
      let strength = 0;
      let feedbackText = [];

      // Check password strength
      if (password.length >= passwordValidation.minLength) strength++;
      else feedbackText.push("At least 8 characters");

      if (passwordValidation.hasUpperCase.test(password)) strength++;
      else feedbackText.push("One uppercase letter");

      if (passwordValidation.hasLowerCase.test(password)) strength++;
      else feedbackText.push("One lowercase letter");

      if (passwordValidation.hasNumber.test(password)) strength++;
      else feedbackText.push("One number");

      if (passwordValidation.hasSpecial.test(password)) strength++;
      else feedbackText.push("One special character");

      // Update UI
      strengthBar.className =
        "strength-bar " +
        (strength <= 2 ? "weak" : strength <= 4 ? "medium" : "strong");

      feedback.innerHTML = feedbackText.length
        ? `<i class="fas fa-info-circle"></i> ${feedbackText.join(" • ")}`
        : '<i class="fas fa-check-circle"></i> Strong password';
    });
  }

  // Form validation
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errors = [];
      const password = form.querySelector('input[name="password"]');
      const confirmPassword = form.querySelector(
        'input[name="confirmPassword"]'
      );

      if (confirmPassword && password.value !== confirmPassword.value) {
        errors.push("Passwords do not match");
      }

      if (errors.length === 0) {
        form.submit();
      } else {
        showError(errors[0]);
      }
    });
  });

  function showError(message) {
    const existingError = document.querySelector(".error-message");
    if (existingError) existingError.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

    const form = document.querySelector(".auth-form");
    form.insertBefore(errorDiv, form.firstChild);

    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }
});
