import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
// MUI Components
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { CircularProgress, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails, TextField, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Select from 'react-select';
import { ClipboardCopy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
// MUI Icon for accordion expansion
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import describerLogo from './icons/Logo 2.png';
import miniLogo from './icons/MOP.png';
import bmwLogo from './icons/BOP.png';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Custom styles for react-select to force a white background
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'white',
    borderColor: state.isFocused ? '#3f51b5' : provided.borderColor,
    boxShadow: state.isFocused ? '0 0 0 1px #3f51b5' : provided.boxShadow,
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'white',
  })
};

export const systemMessage = `
You are an expert Car Sales Manager. Your knowledge of vehicles is exact and up to date. All brands, all models, options, specs, and features are known to you.

You are given a PDF of a vehicle. Your job is to create a description of the vehicle that is engaging, informative, and persuasive.

The description should be written in the style of a car sales manager writing a description for a vehicle listing on a car dealership website meant to engage and convert clients.
- Seamlessly integrate features into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of key features.
- Use the model name (not the code), and format in Markdown.
- Write two compelling paragraphs that capture the essence of the vehicle, emphasizing its standout features, performance, and design in an engaging, conversational, brand appropriate tone.
`;

const invoiceOptions = [
  { value: 'MINI', label: 'MINI' },
  { value: 'BMW', label: 'BMW' },
  { value: 'USED', label: 'Used' },
  { value: 'DEEPSEEK', label: 'DeepSeek (Beta)' },
];

const toneOptions = [
  { value: 'Conversational', label: 'Conversational' },
  { value: 'Luxury-Focused', label: 'Luxury-Focused' },
  { value: 'Energetic', label: 'Energetic' },
];

const defaultPrompts = {
  MINI: `You are an expert automotive copywriter specializing in MINI Cooper vehicles.
You are given a document containing multiple invoices. Each invoice starts with the header "Vehicle Inquiry".
For each invoice, generate an engaging, high-converting description for a car listing:
- Write two compelling paragraphs capturing the vehicle's essence.
- Follow with a clear, skimmable bullet-point list of key features.
- Avoid technical jargon and use Markdown formatting.`,
  BMW: `You are an expert automotive copywriter specializing in BMW vehicles. Your task is to create engaging, high-converting descriptions that appeal to online car shoppers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more engaging and informative.
Write two compelling paragraphs that capture the character and value of the used vehicle, emphasizing its features, in a tone that is both informative and inviting.
Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential options only expanding package content where applicable.
- Use the model name (not the code), and format in Markdown.`,
  USED: `You are an automotive copywriter specializing in used cars. Examine this document thoroughly, building a comprehensive description of the vehicle. 
Your task is to create persuasive, conversion-focused descriptions that effectively showcase the vehicle's standout options, proven reliability, and exceptional value to convert buyers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more accurate, engaging and informative.
- Write two compelling paragraphs that capture the character and value of the used vehicle, emphasizing its unique features, current performance, and overall quality in a tone that is both informative and inviting.
- Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential options only.
- Use the model name (not the code), and format in Markdown.`,
  DEEPSEEK: `You are an automotive copywriter with a unique voice—a stereotypical, angry Asian woman who isn't afraid to yell her praises (and critiques) in broken English. Your task is to craft a compelling and concise description for a used car that doesn't just sell the car, but also entertains the reader.
Write a sharp, witty paragraph that highlights the key features and unique qualities of the vehicle, using language that's both punchy and playful.
Emphasize the car's newness, luxury features, and smart technology in a way that feels like you're both boasting and poking fun at its sophistication.
Include a brief, bullet-point list of essential features, keeping the tone light and the details clear.
Use the model name (not the code), and format the description in Markdown.`
};

// PdfThumbnail component renders the first page of a PDF as a thumbnail and supports a click
function PdfThumbnail({ file, onClick }) {
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    const renderPdf = async () => {
      try {
        const data = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(new Uint8Array(data)).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL();
        setImageSrc(dataUrl);
      } catch (err) {
        console.error("Error rendering PDF thumbnail", err);
      }
    };
    renderPdf();
  }, [file]);

  return (
    <div style={{ marginBottom: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => onClick(file)}>
      {imageSrc ? (
        <img src={imageSrc} alt={file.name} style={{ width: '100%', maxWidth: '200px' }} />
      ) : (
        <CircularProgress size={24} />
      )}
      <Typography variant="caption">{file.name}</Typography>
    </div>
  );
}

// PdfViewerDialog renders all pages of the PDF in a scrollable modal
function PdfViewerDialog({ file, open, onClose }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (file && open) {
      const renderAllPages = async () => {
        try {
          const data = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument(new Uint8Array(data)).promise;
          const numPages = pdf.numPages;
          const pagesData = [];
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            pagesData.push(canvas.toDataURL());
          }
          setPages(pagesData);
        } catch (err) {
          console.error("Error rendering PDF pages", err);
        }
      };
      renderAllPages();
    }
  }, [file, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{file ? file.name : "PDF Viewer"}</DialogTitle>
      <DialogContent dividers style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {pages.length > 0 ? (
          pages.map((src, index) => (
            <img key={index} src={src} alt={`Page ${index + 1}`} style={{ width: '100%', marginBottom: '16px' }} />
          ))
        ) : (
          <CircularProgress />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

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
  const [refinementInputs, setRefinementInputs] = useState({});
  const [refinementOpen, setRefinementOpen] = useState({});
  const [revisionHistory, setRevisionHistory] = useState({});
  const [toneStyle, setToneStyle] = useState("Conversational");
  const [callToAction, setCallToAction] = useState("");
  const [customPrompts, setCustomPrompts] = useState(defaultPrompts);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [previewGroups, setPreviewGroups] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [selectedPdf, setSelectedPdf] = useState(null);

  const isVehicleInquiryHeader = (text) => /^Vehicle Inquiry/i.test(text);
  const getRealText = (pageText) => pageText.replace(/^Page \d+:\s*/, '');
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

  const readPDF = useCallback(async (file) => {
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
  }, []);

  const validateFiles = useCallback((files) => {
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
  }, []);

  const handlePreview = useCallback(async () => {
    try {
      setIsLoading(true);
      let allGroups = [];
      for (const file of selectedFiles) {
        const pages = await readPDF(file);
        const groups = groupInvoices(pages);
        groups.forEach((groupText, index) => {
          allGroups.push({ id: `${file.name}-${index}`, text: groupText, selected: true });
        });
      }
      setPreviewGroups(allGroups);
      setNotification({ open: true, message: `${allGroups.length} content groups extracted for preview.`, severity: "info" });
    } catch (error) {
      console.error(error);
      setError(`Error generating preview: ${error.message}`);
      setNotification({ open: true, message: `Error generating preview: ${error.message}`, severity: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles, readPDF]);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setResponses([]);
    setProgress(0);
    try {
      setIsLoading(true);
      setApiStatus('loading');
      let groupsToProcess;
      if (previewGroups.length > 0) {
        groupsToProcess = previewGroups.filter(g => g.selected).map(g => g.text);
      } else {
        groupsToProcess = [];
        for (const file of selectedFiles) {
          const pages = await readPDF(file);
          const invoiceGroups = groupInvoices(pages);
          groupsToProcess.push(...invoiceGroups);
        }
      }
      const totalGroups = groupsToProcess.length;
      for (let i = 0; i < totalGroups; i++) {
        const groupText = groupsToProcess[i];
        const requestBody = generateCombinedPrompt(groupText, selectedType, mileage);
        if (callToAction) {
          requestBody.messages[1].content += `\n\nCall-to-Action: ${callToAction}`;
        }
        if (toneStyle) {
          requestBody.messages[1].content += `\n\nTone & Style: ${toneStyle}`;
        }
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        let generatedResponse = "No Response";
        if (data.choices && data.choices.length > 0) {
          generatedResponse = data.choices[0].message.content;
        }
        setResponses(prev => [...prev, generatedResponse]);
        setProgress(Math.round(((i + 1) / totalGroups) * 100));
      }
      setApiStatus("idle");
      setNotification({ open: true, message: "Response generated successfully!", severity: "success" });
    } catch (error) {
      console.error(error);
      setError(`Error processing files: ${error.message}`);
      setApiStatus("error");
      setNotification({ open: true, message: `Error: ${error.message}`, severity: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles, selectedType, mileage, previewGroups, callToAction, toneStyle, readPDF]);

  const generateCombinedPrompt = (documentData, selectedType, mileage) => {
    const customPrompt = customPrompts[selectedType] || `Default prompt for ${selectedType}`;
    if (selectedType === 'MINI') {
      return {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: customPrompt,
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
    return {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: customPrompt,
        },
        {
          role: "user",
          content: `Please analyze the following document:\n\n${documentData}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };
  };

  const handleFileChange = useCallback((e) => {
    const validFiles = validateFiles(e.target.files);
    setSelectedFiles(validFiles);
    if (validFiles.length > 0) {
      setNotification({ open: true, message: `${validFiles.length} file(s) selected.`, severity: "info" });
    }
  }, [validateFiles]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setNotification({ open: true, message: "Copied to clipboard!", severity: "success" });
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = [...e.dataTransfer.files];
    const validFiles = validateFiles(files);
    setSelectedFiles(validFiles);
    if (validFiles.length > 0) {
      setNotification({ open: true, message: `${validFiles.length} file(s) dropped.`, severity: "info" });
    }
  }, [validateFiles]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Space') {
      e.preventDefault();
      document.getElementById('file-upload').click();
    }
  }, []);

  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const togglePromptSettings = () => {
    setShowPromptSettings(prev => !prev);
  };

  const handlePromptChange = (e) => {
    setCustomPrompts(prev => ({
      ...prev,
      [selectedType]: e.target.value,
    }));
  };

  const toggleGroupSelection = (id) => {
    setPreviewGroups(prev => prev.map(group => group.id === id ? { ...group, selected: !group.selected } : group));
  };

  const handleThumbnailClick = (file) => {
    setSelectedPdf(file);
  };

  const handleFeatureRequest = () => {
    window.location.href = "mailto:laskocreative@gmail.com?subject=Feature%20Request&body=Hi,%0A%0APlease describe the feature you would like to request:";
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap' }}>
        {/* Left Column: Inputs and Advanced Options */}
        <div style={{ flex: '1 1 300px' }}>
          <Card style={{ padding: '16px', marginBottom: '16px' }}>
            <CardContent>
              <header style={{ textAlign: 'center', marginBottom: '16px' }}>
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={describerLogo}
                  alt="Describer Logo"
                  style={{ width: '96px', margin: '0 auto' }}
                />
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '8px' }}
                >
                  Describer
                </motion.h1>
              </header>
              {/* File Upload */}
              <div 
                style={{
                  border: isDragging ? '2px solid #3f51b5' : '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '16px',
                  transition: 'all 0.3s',
                  position: 'relative'
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
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Drag and drop your files here, or click to select files
                  </Typography>
                </div>
                {selectedFiles.length > 0 && (
                  <Typography variant="caption" color="textSecondary" style={{ marginTop: '4px', display: 'block' }}>
                    {selectedFiles.length} file(s) selected
                  </Typography>
                )}
              </div>
              {/* Document Type */}
              <div style={{ marginTop: '16px' }}>
                <label htmlFor="documentType" style={{ display: 'block', fontSize: '0.875rem', color: '#4b5563', marginBottom: '8px' }}>
                  Document Type:
                </label>
                <Select
                  id="documentType"
                  options={invoiceOptions}
                  value={invoiceOptions.find(opt => opt.value === selectedType)}
                  onChange={(selectedOption) => setSelectedType(selectedOption.value)}
                  styles={customSelectStyles}
                  aria-label="Select document type"
                />
                {selectedType === 'USED' && (
                  <div style={{ marginTop: '12px' }}>
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
              </div>
              {/* Advanced Options */}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Button variant="outlined" onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                </Button>
              </div>
              {showAdvanced && (
                <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', background: '#f9f9f9' }}>
                  {selectedFiles.length > 0 && (
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                      <Button variant="outlined" onClick={handlePreview} disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Preview PDF Content'}
                      </Button>
                    </div>
                  )}
                  {previewGroups.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Preview & Select Content Groups:
                      </Typography>
                      {previewGroups.map(group => (
                        <div key={group.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', background: '#fafafa', padding: '8px', borderRadius: '4px' }}>
                          <input 
                            type="checkbox" 
                            checked={group.selected} 
                            onChange={() => toggleGroupSelection(group.id)} 
                            style={{ marginRight: '8px' }}
                            aria-label="Select content group"
                          />
                          <Typography variant="body2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.text.slice(0, 100)}...
                          </Typography>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#4b5563', marginBottom: '8px' }}>Tone & Style:</label>
                      <Select
                        options={toneOptions}
                        value={toneOptions.find(opt => opt.value === toneStyle)}
                        onChange={(selectedOption) => setToneStyle(selectedOption.value)}
                        styles={customSelectStyles}
                        aria-label="Select tone and style"
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <TextField
                        label="Call-to-Action"
                        fullWidth
                        variant="outlined"
                        value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)}
                        placeholder="Enter a call-to-action (e.g., Schedule your test drive today!)"
                        aria-label="Call-to-Action input"
                      />
                    </div>
                    <Accordion style={{ marginTop: '16px' }}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="prompt-settings-content"
                        id="prompt-settings-header"
                      >
                        <Typography variant="subtitle2">Prompt Settings for {selectedType}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TextField
                          label="Custom Prompt Template"
                          multiline
                          fullWidth
                          variant="outlined"
                          value={customPrompts[selectedType]}
                          onChange={handlePromptChange}
                          aria-label="Custom prompt template"
                        />
                        <Button variant="contained" color="primary" onClick={togglePromptSettings} style={{ marginTop: '8px' }}>
                          {showPromptSettings ? "Hide" : "Show"} Instructions
                        </Button>
                        {showPromptSettings && (
                          <Typography variant="caption" display="block" style={{ marginTop: '8px' }}>
                            Edit the prompt template above to tailor how the description is generated.
                          </Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Middle Column: Results */}
        <div style={{ flex: '1 1 300px' }}>
          <Card style={{ padding: '16px' }}>
            <CardContent>
              {isLoading && (
                <div style={{ marginTop: '16px' }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" display="block" align="center">{progress}% completed</Typography>
                </div>
              )}
              {(selectedFiles.length > 0 || previewGroups.length > 0) && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Button variant="contained" onClick={handleAnalyze} disabled={isLoading}>
                    {isLoading ? <CircularProgress size={24} /> : 'Generate Description'}
                  </Button>
                </div>
              )}
              {error && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '4px' }}>
                  <Typography variant="body2" color="error">{error}</Typography>
                </div>
              )}
              {responses.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                  {responses.map((response, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ marginBottom: '16px' }}
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
                          {refinementOpen[idx] ? (
                            <div style={{ marginTop: '8px' }}>
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
                                onClick={() => {
                                  const currentResponse = responses[idx];
                                  const improvementInstructions = refinementInputs[idx];
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
                                  (async () => {
                                    try {
                                      setIsLoading(true);
                                      setApiStatus('loading');
                                      const res = await fetch("https://api.openai.com/v1/chat/completions", {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${openAiApiKey}`,
                                        },
                                        body: JSON.stringify(requestBody),
                                      });
                                      const data = await res.json();
                                      if (data.choices && data.choices.length > 0) {
                                        const newResponse = data.choices[0].message.content;
                                        setRevisionHistory(prev => {
                                          const history = prev[idx] ? [...prev[idx]] : [];
                                          history.push(currentResponse);
                                          return { ...prev, [idx]: history };
                                        });
                                        setResponses(prev => {
                                          const updated = [...prev];
                                          updated[idx] = newResponse;
                                          return updated;
                                        });
                                        setRefinementOpen(prev => ({ ...prev, [idx]: false }));
                                        setNotification({ open: true, message: "Response refined successfully!", severity: "success" });
                                      }
                                      setApiStatus("idle");
                                    } catch (error) {
                                      console.error(error);
                                      setError(`Error refining response: ${error.message}`);
                                      setApiStatus("error");
                                      setNotification({ open: true, message: `Error refining response: ${error.message}`, severity: "error" });
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  })();
                                }}
                                style={{ marginTop: '8px' }}
                              >
                                Submit Improvement
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="text"
                              onClick={() => setRefinementOpen(prev => ({ ...prev, [idx]: true }))}
                              style={{ marginTop: '8px' }}
                            >
                              Improve
                            </Button>
                          )}
                          {revisionHistory[idx] && revisionHistory[idx].length > 0 && (
                            <Accordion style={{ marginTop: '8px' }}>
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="revision-content"
                                id={`revision-header-${idx}`}
                              >
                                <Typography variant="subtitle2">View Previous Versions (Side-by-Side)</Typography>
                              </AccordionSummary>
                              <AccordionDetails style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {revisionHistory[idx].map((rev, revIdx) => (
                                  <div key={revIdx} style={{ flex: '1 1 45%', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                    <Typography variant="caption" display="block">
                                      Version {revIdx + 1}
                                    </Typography>
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]} 
                                      rehypePlugins={[rehypeRaw]}
                                      className="prose prose-sm max-w-none"
                                    >
                                      {rev}
                                    </ReactMarkdown>
                                  </div>
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          )}
                          <div style={{ marginTop: '8px', textAlign: 'right' }}>
                            <Button onClick={() => copyToClipboard(response)} aria-label="Copy to clipboard">
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
        {/* Third Column: PDF Previews */}
        <div style={{ flex: '1 1 300px' }}>
          <Card style={{ padding: '16px' }}>
            <CardContent>
              <Typography variant="h6" style={{ textAlign: 'center', marginBottom: '16px' }}>
                PDF Previews
              </Typography>
              {selectedFiles.length > 0 ? (
                selectedFiles.map((file, idx) => (
                  <PdfThumbnail key={idx} file={file} onClick={handleThumbnailClick} />
                ))
              ) : (
                <Typography variant="body2" style={{ textAlign: 'center' }}>
                  No PDFs selected.
                </Typography>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} style={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
      {/* PDF Viewer Dialog */}
      <PdfViewerDialog file={selectedPdf} open={Boolean(selectedPdf)} onClose={() => setSelectedPdf(null)} />
    </div>
  );
}

export default PdfUploadChatGPTApp;
