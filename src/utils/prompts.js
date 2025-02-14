/*
 * prompts.js (utils version)
 *
 * This file contains prompt templates used by the MINIDescriber application to generate
 * prompts for processing PDF content, summarizing pages, and generating thumbnail descriptions.
 */

/**
 * Generates a prompt to summarize a PDF's content.
 * @param {string} pdfTitle - The title of the PDF document.
 * @param {string} pdfContent - The content of the PDF document.
 * @returns {string} The generated summary prompt.
 */
export const generatePdfSummaryPrompt = (pdfTitle, pdfContent) => {
  return `You are given a PDF titled "${pdfTitle}". Please provide a concise summary of its content.\n\nContent:\n${pdfContent}`;
};

/**
 * Generates a prompt to generate a detailed description for a specific page of a PDF.
 * @param {number} pageNumber - The page number.
 * @param {string} pageContent - The content of the page.
 * @returns {string} The generated page description prompt.
 */
export const generatePageDescriptionPrompt = (pageNumber, pageContent) => {
  return `Please provide a detailed description for page ${pageNumber} of the PDF.\n\nPage Content:\n${pageContent}`;
};

/**
 * Generates a prompt to create a thumbnail description for a PDF.
 * @param {string} pdfTitle - The title of the PDF.
 * @returns {string} The generated thumbnail prompt.
 */
export const generateThumbnailPrompt = (pdfTitle) => {
  return `Generate a thumbnail description that captures the essence of the PDF titled "${pdfTitle}".`;
};
