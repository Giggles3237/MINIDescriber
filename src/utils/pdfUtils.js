import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

// Configure the PDF.js worker. Adjust the workerSrc path as needed for your project setup.
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
}

/**
 * Loads a PDF document from the given URL.
 * @param {string} pdfUrl - The URL of the PDF document.
 * @returns {Promise} A promise that resolves with the loaded PDF document.
 */
export const loadPdfDocument = async (pdfUrl) => {
  const loadingTask = getDocument(pdfUrl);
  const pdfDocument = await loadingTask.promise;
  return pdfDocument;
};

/**
 * Extracts text from a PDF document at the given URL by concatenating text from all pages.
 * @param {string} pdfUrl - The URL of the PDF document.
 * @returns {Promise<string>} A promise that resolves with the extracted text from the PDF.
 */
export const extractTextFromPdf = async (pdfUrl) => {
  const pdfDocument = await loadPdfDocument(pdfUrl);
  let fullText = '';
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
};

/**
 * Renders a specific page of a PDF document onto a given canvas element.
 * @param {string} pdfUrl - The URL of the PDF document.
 * @param {number} pageNumber - The page number to render (1-indexed).
 * @param {HTMLCanvasElement} canvas - The canvas element where the page will be rendered.
 * @param {number} [scale=1.0] - The scale factor for rendering the page.
 * @returns {Promise} A promise that resolves when the page rendering is complete.
 */
export const renderPdfPageToCanvas = async (pdfUrl, pageNumber, canvas, scale = 1.0) => {
  const pdfDocument = await loadPdfDocument(pdfUrl);
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const renderContext = {
    canvasContext: canvas.getContext('2d'),
    viewport
  };
  await page.render(renderContext).promise;
};
