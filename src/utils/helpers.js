// src/utils/helpers.js

// Helper function to format dates
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US');
};

// Helper function to generate a random ID
export const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};

// Helper function to validate email format
export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};