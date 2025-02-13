// PdfUploadChatGPTApp.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
// MUI Components
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { CircularProgress } from '@mui/material';
import TextField from '@mui/material/TextField';
import { ClipboardCopy } from 'lucide-react';
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

// (Existing prompt functions … remain unchanged)

const promptUserForMini = (documentData) => {
  return {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are an expert automotive copywriter specializing in MINI Cooper vehicles. Your task is to create engaging, high-converting descriptions that appeal to online car shoppers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more engaging and informative.
Write two compelling paragraphs that capture the character and value of the used vehicle, emphasizing its features, in a tone that is both informative and inviting.
Seamlessly integrate key details into the narrative rather than listing them mechanically. Write in a cheeky and fun MINI Style
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

const promptUserForBMW = (documentData) => {
  return {
    model: "gpt-4o-mini",
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

const promptUserForUsed = (documentData, mileage = '') => {
  const mileageInfo = mileage ? `\nMileage: ${mileage}` : '';
  return {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are an automotive copywriter specializing in used cars. Examine this document thoroughly, building a comprehensive description of the vehicle. 
Your task is to create persuasive, conversion-focused descriptions that effectively showcase the vehicle's standout options, proven reliability, and exceptional value to convert buyers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more accurate, engaging and informative.
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

const promptUserForDeepSeek = (documentData) => {
  return {
    model: "gpt-4o-mini",
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

const generateCombinedPrompt = (documentData, selectedType, mileage) => {
  if (selectedType === 'MINI') {
    return {
      model: "gpt-4o-mini",
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
  // Fallback to MINI style if none match.
  return generateCombinedPrompt(documentData, 'MINI', mileage);
};

// Helper functions (isVehicleInquiryHeader, getRealText, groupInvoices, groupInvoicesPages) remain unchanged.
const isVehicleInquiryHeader = (text) => /^Vehicle Inquiry/i.test(text);

const getRealText = (pageText) => {
  return pageText.replace(/^Page \d+:\s*/, '');
};

const groupInvoices = (pageTexts) => {
  const invoiceGroups = [];
  let currentGroup = [];
  const blankThreshold = 20;
  const isBlankPage = (text) => text.trim().length < blankThreshold;

  pageTexts.forEach((pageText) => {
    const cleanText = getRealText(pageText);
    if (isBlankPage(cleanText)) {
      if (currentGroup.length > 0) {
        invoiceGroups.push(currentGroup.join("\n"));
        currentGroup = [];
      }
      return;
    }
    if (isVehicleInquiryHeader(cleanText)) {
      if (currentGroup.length > 0) {
        invoiceGroups.push(currentGroup.join("\n"));
        currentGroup = [];
      }
    }
    currentGroup.push(pageText);
  });
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
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // New state for iterative refinement:
  const [refinementInputs, setRefinementInputs] = useState({}); // { index: string }
  const [refinementOpen, setRefinementOpen] = useState({}); // { index: boolean }

  // --- Existing helper functions (groupInvoicesPages, handleAnalyze, readPDF, validateFiles, handleFileChange, copyToClipboard, drag/drop handlers, keyboard handlers) remain unchanged ---

  const groupInvoicesPages = (pageTexts) => {
    const invoiceGroups = [];
    let currentGroup = [];
    const invoiceHeaderRegex = /^(Invoice\s*(Number|#))/i;
    pageTexts.forEach((pageText) => {
      const cleanText = getRealText(pageText);
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

  const handleAnalyze = async () => {
    setError(null); // Clear any previous errors when generating a new response.
    try {
      setIsLoading(true);
      setApiStatus('loading');
      setResponses([]);
      const allResponses = [];
      for (const file of selectedFiles) {
        const pages = await readPDF(file);
        const invoiceGroups = groupInvoices(pages);
        console.log("Invoice Groups:", invoiceGroups);
        for (const groupText of invoiceGroups) {
          const requestBody = generateCombinedPrompt(groupText, selectedType, mileage);
          console.log("Request Body for group:", requestBody);
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify(requestBody),
          });
          const data = await response.json();
          console.log("Response data for group:", data);
          if (data.choices && data.choices.length > 0) {
            allResponses.push(data.choices[0].message.content);
          } else {
            allResponses.push("No Response");
          }
        }
      }
      setResponses(allResponses);
      setApiStatus("idle");
    } catch (error) {
      console.error(error);
      setError(`Error processing files: ${error.message}`);
      setApiStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

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
    // Add toast notification here if desired
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = [...e.dataTransfer.files];
    const validFiles = validateFiles(files);
    setSelectedFiles(validFiles);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Space') {
      e.preventDefault();
      document.getElementById('file-upload').click();
    }
  };

  // --- New function: handleRefine ---
  // This function takes the response at the given index and the refinement instructions provided by the user,
  // then sends a new API call to generate a refined version.
  const handleRefine = async (index) => {
    const currentResponse = responses[index];
    const improvementInstructions = refinementInputs[index];
    if (!improvementInstructions) return;
    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "assistant", content: currentResponse },
        { role: "user", content: improvementInstructions }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };
    try {
      setIsLoading(true);
      setApiStatus('loading');
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        const newResponse = data.choices[0].message.content;
        setResponses(prev => {
          const updated = [...prev];
          updated[index] = newResponse;
          return updated;
        });
        // Optionally close the refinement UI for this response.
        setRefinementOpen(prev => ({ ...prev, [index]: false }));
      }
      setApiStatus("idle");
    } catch (error) {
      console.error(error);
      setError(`Error refining response: ${error.message}`);
      setApiStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }} className="flex items-center justify-center bg-gray-100 p-4 sm:p-6 lg:p-8">
      <Card sx={{ padding: 2, maxWidth: 500, width: '100%' }}>
        <CardContent>
          {/* Status indicator */}
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                marginRight: 8,
                backgroundColor: apiStatus === 'loading' ? '#fbc02d'
                  : apiStatus === 'error' ? '#e53935' : '#43a047',
              }}
            />
            <Typography variant="caption">{apiStatus}</Typography>
          </div>

          <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={describerLogo}
              alt="Describer Logo"
              style={{ width: 96, margin: '0 auto' }}
            />
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: 8 }}
            >
              Describer
            </motion.h1>
          </header>

          <div className="mb-4">
            <label 
              htmlFor="documentType" 
              className="block text-sm font-medium text-gray-700 mb-2"
              id="document-type-label"
            >
              Document Type:
            </label>
            <Select
              id="documentType"
              options={invoiceOptions}
              value={invoiceOptions.find(opt => opt.value === selectedType)}
              onChange={(selectedOption) => setSelectedType(selectedOption.value)}
              className="react-select-container"
              classNamePrefix="react-select"
              aria-labelledby="document-type-label"
            />
          </div>

          <div 
            style={{
              border: isDragging ? '2px solid #3f51b5' : '2px dashed #ccc',
              borderRadius: 8,
              padding: '1.5rem',
              transition: 'all 0.3s',
              position: 'relative',
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onKeyDown={handleKeyDown}
            tabIndex="0"
            role="button"
            aria-label="Upload PDF documents"
          >
            <Typography variant="subtitle1" gutterBottom>
              Upload your PDF documents:
            </Typography>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              style={{ width: '100%' }}
              aria-label="Choose PDF files"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Drag and drop your files here, or click to select files
              </Typography>
            </div>
            {selectedFiles.length > 0 && (
              <Typography variant="caption" color="textSecondary" style={{ marginTop: 4, display: 'block' }}>
                {selectedFiles.length} file(s) selected
              </Typography>
            )}
          </div>

          {selectedType === 'USED' && (
            <div style={{ marginTop: 16 }}>
              <Typography variant="subtitle1" gutterBottom>Mileage:</Typography>
              <input
                id="mileage"
                type="text"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                style={{ width: '100%', padding: '8px', fontSize: '0.875rem' }}
                placeholder="Enter vehicle mileage"
              />
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button variant="contained" onClick={handleAnalyze} disabled={isLoading}>
                {isLoading ? <CircularProgress size={24} /> : 'Generate'}
              </Button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 16, padding: 16, backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 4 }}>
              <Typography variant="body2" color="error">{error}</Typography>
            </div>
          )}

          {responses.length > 0 && (
            <div style={{ marginTop: 32 }}>
              {responses.map((response, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ marginBottom: 16 }}
                >
                  <Card variant="outlined">
                    <CardContent>
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
                      {/* Iterative refinement UI */}
                      {refinementOpen[idx] ? (
                        <div style={{ marginTop: 8 }}>
                          <TextField
                            label="Refinement instructions"
                            multiline
                            fullWidth
                            variant="outlined"
                            value={refinementInputs[idx] || ""}
                            onChange={(e) => setRefinementInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                          />
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleRefine(idx)}
                            style={{ marginTop: 8 }}
                          >
                            Submit Improvement
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="text"
                          onClick={() => setRefinementOpen(prev => ({ ...prev, [idx]: true }))}
                          style={{ marginTop: 8 }}
                        >
                          Improve
                        </Button>
                      )}
                      {/* Copy to clipboard button */}
                      <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <Button onClick={() => copyToClipboard(response)}>
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                      </div>
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
