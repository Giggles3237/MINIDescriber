// PdfUploadChatGPTApp.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCopy } from 'lucide-react';
import { Oval } from "react-loader-spinner";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import Select from 'react-select';
import describerLogo from './icons/Logo 2.png';
import miniLogo from './icons/MOP.png';
import bmwLogo from './icons/BOP.png';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

export const systemMessage = `
You are an expert Car Sales Manager. Your knowledge of vehicles is exact an up to date. All brands, all models, options, specs, and features are known to you.

You are given a PDF of a vehicle. Your job is to create a description of the vehicle that is engaging, informative, and persuasive.

The description should be written in the style of a car sales manager writing a description for a vehicle listing on a car dealership website meant to engage and convert clients.
- Seamlessly integrate features into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of key features.
- Use the model name (not the code), and format in Markdown.
- Write two compelling paragraphs that capture the essence of the vehicle, emphasizing its standout features, performance, and design in an engaging, conversational, brand appropriate tone.
`;

const headerBrand = {
  headerLogo: describerLogo,
  headerAlt: 'Describer Logo',
  brandName: 'DESCRIBER',
  inlineLogo: describerLogo,
  inlineLogoAlt: 'Describer Icon',
};

const brands = {
  MINI: {
    headerLogo: miniLogo,
    headerAlt: 'MINI Logo',
    brandName: 'MINI Cooper Invoice',
    inlineLogo: miniLogo,
    inlineLogoAlt: 'MINI Icon',
  },
  BMW: {
    headerLogo: bmwLogo,
    headerAlt: 'BMW Logo',
    brandName: 'BMW Invoice',
    inlineLogo: bmwLogo,
    inlineLogoAlt: 'BMW Icon',
  },
  USED: {
    headerLogo: describerLogo,
    headerAlt: 'Used Car Logo',
    brandName: 'Used Car',
    inlineLogo: describerLogo,
    inlineLogoAlt: 'Used Car Icon',
  },
};

const invoiceOptions = [
  { value: 'MINI', label: 'MINI' },
  { value: 'BMW', label: 'BMW' },
  { value: 'USED', label: 'Used' },
  { value: 'DEEPSEEK', label: 'DeepSeek (Beta)' },
];

// Prompt function for MINI documents
const promptUserForMini = (documentData) => {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an expert automotive copywriter specializing in MINI Cooper vehicles. Your task is to create engaging, high-converting descriptions that appeal to online car shoppers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more engaging and informative.
Write two compelling paragraphs that capture the character and value of the used vehicle, emphasizing its features, in a tone that is both informative and inviting.
Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential options only expanding package content where applicable.
- Use the model name (not the code), and format in Markdown.
        `,
      },
      {
        role: "user",
        content: `Please process the following MINI document data:\n\n${documentData}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  };
};

// Prompt function for BMW documents
const promptUserForBMW = (documentData) => {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an expert automotive copywriter specializing in BMW vehicles. Your task is to create engaging, high-converting descriptions that appeal to online car shoppers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more engaging and informative.
Write two compelling paragraphs that capture the character and value of the used vehicle, emphasizing its features, in a tone that is both informative and inviting.
Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential options only expanding package content where applicable.
- Use the model name (not the code), and format in Markdown.
        `,
      },
      {
        role: "user",
        content: `Please process the following BMW document data:\n\n${documentData}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  };
};

// Prompt function for Used Car documents
const promptUserForUsed = (documentData, mileage = '') => {
  const mileageInfo = mileage ? `\nMileage: ${mileage}` : '';
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an automotive copywriter specializing in used cars. Examine this document thoroughly, building a comprehensive description of the vehicle. Your task is to create persuasive, conversion-focused descriptions that effectively showcase the vehicle's standout options, proven reliability, and exceptional value to convert buyers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more engaging and informative.
- Write two compelling paragraphs that capture the character and value of the used vehicle, emphasizing its unique features, current performance, and overall quality in a tone that is both informative and inviting.
- Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential options only.
- Use the model name (not the code), and format in Markdown.
        `,
      },
      {
        role: "user",
        content: `Please process the following used car document data${mileageInfo}:\n\n${documentData}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  };
};

// Prompt function for DeepSeek (Beta) documents
const promptUserForDeepSeek = (documentData) => {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are an automotive copywriter with a unique voice—a stereotypical, angry Asian woman who isn't afraid to yell her praises (and critiques) in broken English.  Your task is to craft a compelling and concise description for a used car that doesn't just sell the car, but also entertains the reader.
Write a sharp, witty paragraph that highlights the key features and unique qualities of the vehicle, using language that's both punchy and playful.
Emphasize the car's newness, luxury features, and smart technology in a way that feels like you're both boasting and poking fun at its sophistication.
Include a brief, bullet-point list of essential features, keeping the tone light and the details clear.
Use the model name (not the code), and format the description in Markdown.`,
      },
      {
        role: "user",
        content: `Please process the following DeepSeek document data:\n\n${documentData}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  };
};

// New combined prompt generator for multi-invoice PDFs
const generateCombinedPrompt = (documentData, selectedType, mileage) => {
  if (selectedType === 'MINI') {
    return {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
You are an expert automotive copywriter specializing in MINI Cooper vehicles.
You are given a document containing multiple invoices. Each invoice starts with the header "Vehicle Inquiry".
For each invoice, generate an engaging, high-converting description for a car listing:
- Write two compelling paragraphs capturing the vehicle's essence.
- Follow with a clear, skimmable bullet-point list of key features.
- Avoid technical jargon and use Markdown formatting.
          `,
        },
        {
          role: "user",
          content: `Please analyze the following document containing multiple invoices:\n\n${documentData}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };
  }
  // You can create similar prompt functions for BMW, USED, or DEEPSEEK if needed.
  // For now, if none match we'll fallback to the MINI style.
  return generateCombinedPrompt(documentData, 'MINI', mileage);
};

// Helper to check if a page starts with "Vehicle Inquiry"
const isVehicleInquiryHeader = (text) => /^Vehicle Inquiry/i.test(text);

// Remove the "Page X:" prefix (common to all pages) to get the actual content.
const getRealText = (pageText) => {
  return pageText.replace(/^Page \d+:\s*/, '');
};

// Updated grouping function that uses "Vehicle Inquiry" as a separator
const groupInvoices = (pageTexts) => {
  const invoiceGroups = [];
  let currentGroup = [];

  // Set a threshold to consider a page blank (e.g., less than 20 non-space characters)
  const blankThreshold = 20;
  const isBlankPage = (text) => text.trim().length < blankThreshold;

  pageTexts.forEach((pageText) => {
    const cleanText = getRealText(pageText);

    // If the page is nearly blank, treat it as a separator.
    if (isBlankPage(cleanText)) {
      if (currentGroup.length > 0) {
        invoiceGroups.push(currentGroup.join("\n"));
        currentGroup = [];
      }
      return;
    }

    // If the page starts with "Vehicle Inquiry", start a new invoice group.
    if (isVehicleInquiryHeader(cleanText)) {
      if (currentGroup.length > 0) {
        invoiceGroups.push(currentGroup.join("\n"));
        currentGroup = [];
      }
      currentGroup.push(pageText);
    } else {
      // Otherwise, continue adding pages to the current group.
      currentGroup.push(pageText);
    }
  });

  // Add any remaining pages as an invoice group.
  if (currentGroup.length > 0) {
    invoiceGroups.push(currentGroup.join("\n"));
  }

  return invoiceGroups;
};

function PdfUploadChatGPTApp() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedType, setSelectedType] = useState("MINI");
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('idle');
  const [mileage, setMileage] = useState('');

  // --- Helper Functions ---

  // Group pages into separate invoices based on a header pattern.
  // This regex assumes that an invoice starts when a page's content (after cleaning)
  // starts with "Invoice Number" or "Invoice #". Adjust the pattern as needed.
  const groupInvoices = (pageTexts) => {
    const invoiceGroups = [];
    let currentGroup = [];
    const invoiceHeaderRegex = /^(Invoice\s*(Number|#))/i;

    pageTexts.forEach((pageText) => {
      const cleanText = getRealText(pageText);
      // If a new invoice header is detected and we've already gathered pages for an invoice,
      // then push the current group as one invoice and start a new group.
      if (invoiceHeaderRegex.test(cleanText) && currentGroup.length > 0) {
        invoiceGroups.push(currentGroup.join("\n"));
        currentGroup = [pageText];
      } else {
        currentGroup.push(pageText);
      }
    });

    if (currentGroup.length > 0) {
      invoiceGroups.push(currentGroup.join("\n"));
    }

    return invoiceGroups;
  };

  // --- Modified Handle Analyze Function ---
  // Group pages by invoice and process each group.
  const handleAnalyze = async () => {
    try {
      setIsLoading(true);
      setApiStatus('loading');
      setResponses([]);
      let combinedText = '';

      // Combine pages from every selected PDF file
      for (const file of selectedFiles) {
        const pages = await readPDF(file);
        // Join pages with newlines; make sure invoice separators like "Vehicle Inquiry" remain intact.
        combinedText += pages.join("\n") + "\n\n";
      }

      // Send one API request with all invoices combined.
      const requestBody = generateCombinedPrompt(combinedText, selectedType, mileage);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        const rawContent = data.choices[0].message.content;
        setResponses([rawContent]);
      } else {
        setResponses(['No response']);
      }
      setApiStatus('idle');
    } catch (error) {
      console.error(error);
      setError(`Error processing file: ${error.message}`);
      setApiStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- The readPDF Function (unchanged) ---
  const readPDF = async (file) => {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onload = async function () {
        try {
          const typedArray = new Uint8Array(this.result);
          const pdf = await pdfjs.getDocument(typedArray).promise;
          const pageTexts = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            pageTexts.push(`Page ${i}:\n${pageText}`);
          }
          resolve(pageTexts);
        } catch (err) {
          reject(err);
        }
      };
      fileReader.readAsArrayBuffer(file);
    });
  };

  const validateFiles = (files) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    const validFiles = [];
    
    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf') {
        setError(`Invalid file type: ${file.name} is not a PDF`);
      } else if (file.size > MAX_SIZE) {
        setError(`File too large: ${file.name} exceeds 5MB`);
      } else {
        validFiles.push(file);
      }
    });
    
    return validFiles;
  };

  const handleFileChange = (e) => {
    const validFiles = validateFiles(e.target.files);
    setSelectedFiles(validFiles);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Add toast notification here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 sm:p-6 lg:p-8">
      <Card className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-md w-full max-w-lg mx-2 sm:mx-4">
        <CardContent>
          <div className="absolute top-4 right-4 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              apiStatus === 'loading' ? 'bg-yellow-400' :
              apiStatus === 'error' ? 'bg-red-500' :
              'bg-green-500'
            }`} />
            <span className="text-sm text-gray-600">{apiStatus}</span>
          </div>

          <header className="mb-6 text-center">
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={describerLogo}
              alt="Describer Logo"
              className="mx-auto w-24"
            />
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold mt-2"
            >
              Describer
            </motion.h1>
          </header>

          <div className="mb-4">
            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-2">
              Document Type:
            </label>
            <Select
              id="documentType"
              options={invoiceOptions}
              value={invoiceOptions.find(opt => opt.value === selectedType)}
              onChange={(selectedOption) => setSelectedType(selectedOption.value)}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Upload your PDF documents:
            </label>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500"
            />
            {selectedFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{selectedFiles.length} file(s) selected.</p>
            )}
          </div>

          {selectedType === 'USED' && (
            <div className="mb-4">
              <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-2">
                Mileage:
              </label>
              <input
                id="mileage"
                type="text"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="block w-full text-sm text-gray-500"
                placeholder="Enter vehicle mileage"
              />
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="mb-4 text-center">
              <Button onClick={handleAnalyze} disabled={isLoading}>
                {isLoading ? "Generating..." : "Generate"}
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Oval
                height={40}
                width={40}
                color="#4F46E5"
                wrapperStyle={{}}
                wrapperClass=""
                visible={true}
                ariaLabel="oval-loading"
                secondaryColor="#C7D2FE"
                strokeWidth={2}
                strokeWidthSecondary={2}
              />
              <span className="ml-2 text-gray-600">Analyzing PDF...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {responses.length > 0 && (
            <div className="mt-8 space-y-4">
              {responses.map((response, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <Card className="border rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-gray-50 p-2 border-b flex items-center">
                      <img 
                        src={(brands[selectedType] || headerBrand).inlineLogo} 
                        alt="Brand Logo" 
                        className="h-6 mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {(brands[selectedType] || headerBrand).brandName.replace(/invoice/gi, '').trim()}
                      </span>
                      <button
                        onClick={() => copyToClipboard(response)}
                        className="ml-auto p-1 text-gray-500 hover:text-indigo-600"
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </button>
                    </div>
                    <CardContent className="p-4 bg-white">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeRaw]}
                        className="prose prose-sm max-w-none"
                        components={{
                          h2: ({ ...props }) => <h2 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                          ul: ({ ...props }) => <ul className="list-disc pl-6 mb-4" {...props} />,
                          strong: ({ ...props }) => <strong className="font-semibold text-gray-800" {...props} />
                        }}
                      >
                        {response}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PdfUploadChatGPTApp;