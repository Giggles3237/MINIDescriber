// PdfUploadChatGPTApp.jsx

// QUESTIONS FOR USER:
// 1) Are you comfortable using a public CDN to load the PDF.js worker?
// 2) Should we attempt a fallback if the CDN fails?
// 3) Do you have any custom domain or storage to host the worker file?

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import describerLogo from './icons/Logo 2.png';
import miniLogo from './icons/MOP.png';       // Updated MINI Logo
import bmwLogo from './icons/BOP.png';         // Reserved for BMW

// Load the PDF.js worker from a public CDN
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

// System message for the chatbot
export const systemMessage = `
You are an automotive copywriter. Use a bold, playful tone. Weave features into an appealing narrative—no mechanical lists in the paragraphs.
Two paragraphs of description, then bullet features. Use model names not codes. Format in Markdown.
`;

// Fixed header branding for the app: DESCRIBER
const headerBrand = {
  headerLogo: describerLogo,
  headerAlt: 'Describer Logo',
  brandName: 'DESCRIBER',
  inlineLogo: describerLogo,
  inlineLogoAlt: 'Describer Icon',
};

// Branding configuration for prompt functions (dropdown determines which prompt to use)
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

// Prompt function for MINI Cooper invoices
const promptUserForMini = (invoiceData) => {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an expert automotive copywriter specializing in MINI Cooper vehicles. Your task is to create engaging, high-converting descriptions that appeal to online car shoppers.
Avoid overly technical jargon.
- Write two compelling paragraphs that capture the essence of the vehicle, emphasizing its standout features, performance, and design in an engaging, MINI, playful yet informative tone.
- Seamlessly integrate features into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of key features.
- Use the model name (not the code), and format in Markdown.
        `,
      },
      {
        role: "user",
        content: `Please process the following MINI invoice data:\n\n${invoiceData}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  };
};

// Prompt function for BMW invoices
const promptUserForBMW = (invoiceData) => {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an expert automotive copywriter specializing in BMW vehicles. Your task is to create engaging, high-converting descriptions that appeal to online car shoppers.
Avoid overly technical jargon.
- Write two compelling paragraphs that capture the essence of the vehicle, emphasizing its standout options, performance, and design in an engaging, BMW, playful yet informative tone.
- Seamlessly integrate features into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of key features.
- Use the model name (not the code), and format in Markdown.
        `,
      },
      {
        role: "user",
        content: `Please process the following BMW invoice data:\n\n${invoiceData}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  };
};

// Prompt function for Used Car data
const promptUserForUsed = (invoiceData) => {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an automotive copywriter specializing in used cars. Your task is to create appealing, buyer-friendly descriptions that highlight the vehicle's history, reliability, and value.
Avoid overly technical jargon.
- Write two compelling paragraphs that capture the character and value of the used vehicle, emphasizing its unique features, current performance, and overall quality in a tone that is both informative and inviting.
- Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential features.
- Use the model name (not the code), and format in Markdown.
        `,
      },
      {
        role: "user",
        content: `Please process the following used car data:\n\n${invoiceData}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  };
};

// Function to read PDFs and extract text from each page
const readPDF = async (file) => {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onload = async function() {
      try {
        const typedArray = new Uint8Array(this.result);
        const pdf = await pdfjs.getDocument(typedArray).promise;
        const pageTexts = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
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

function convertHtmlToMarkdown(text) {
  return text
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em[^>]*>/gi, '_')
    .replace(/<\/em>/gi, '_')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n');
}

function PdfUploadChatGPTApp() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedType, setSelectedType] = useState("MINI");
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFiles([...e.target.files]);
  };

  const handleAnalyze = async () => {
    try {
      setIsLoading(true);
      setResponses([]);
      const pdfPagesArrays = await Promise.all(
        selectedFiles.map(async (file) => await readPDF(file))
      );
      const pageTexts = pdfPagesArrays.flat();
      const newResponses = [];
      for (const pageText of pageTexts) {
        let requestBody;
        if (selectedType === "MINI") {
          requestBody = promptUserForMini(pageText);
        } else if (selectedType === "BMW") {
          requestBody = promptUserForBMW(pageText);
        } else if (selectedType === "USED") {
          requestBody = promptUserForUsed(pageText);
        }
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
          const processedContent = convertHtmlToMarkdown(rawContent);
          newResponses.push(processedContent);
        } else {
          newResponses.push('No response');
        }
      }
      setResponses(newResponses);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        style={{ fontFamily: 'serif' }}
        className="min-h-screen w-full px-4 py-8 flex flex-col items-center justify-center text-black bg-white"
      >
        <header className="flex flex-col items-center mb-6">
          <img
            src={headerBrand.headerLogo}
            alt={headerBrand.headerAlt}
            className="w-32 sm:w-36 md:w-48 mb-4"
          />
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2"
          >
            {headerBrand.brandName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg sm:text-xl md:text-2xl mb-6"
          >
            Unleash your vehicle's story.
          </motion.p>
        </header>

        <Card className="w-full max-w-md sm:max-w-lg shadow-xl rounded-xl border-2 border-[#e62020] bg-white dark:bg-gray-800 mb-8 mx-auto">
          <CardContent>
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">
                Select Invoice Type:
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
              >
                <option value="MINI">MINI Cooper Invoice</option>
                <option value="BMW">BMW Invoice</option>
                <option value="USED">Used Car</option>
              </select>
            </div>
            <label className="block text-sm font-medium text-black mb-2">
              Upload your documents:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                className="border border-gray-300 rounded-md p-2 text-black"
              />
              <Button
                onClick={handleAnalyze}
                disabled={!selectedFiles.length || isLoading}
                className="bg-[#e62020] hover:bg-[#bf1c1c] text-white font-semibold py-2 px-4 rounded-md flex items-center"
              >
                {isLoading ? 'Analyzing...' : 'Generate Description'}
                <Upload className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {responses.length > 0 && (
          <div className="w-full max-w-3xl mt-8 grid gap-6">
            {responses.map((resp, idx) => (
              <Card key={idx} className="p-4 shadow-xl rounded-lg bg-white dark:bg-gray-800 border border-gray-200">
                <CardContent>
                  <h2 className="font-bold text-xl text-black mb-2">
                    <img
                      src={headerBrand.inlineLogo}
                      alt={headerBrand.inlineLogoAlt}
                      className="w-8 sm:w-10 md:w-12 inline mr-2"
                    />
                    Response for Vehicle #{idx + 1}
                  </h2>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    skipHtml={false}
                    rehypePlugins={[rehypeRaw]}
                    className="prose max-w-prose mx-auto"
                  >
                    {resp}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default PdfUploadChatGPTApp;

// Below is a small test suite to confirm that readPDF handles basic flows.
// We'll be using Jest as an example.
// This is purely illustrative — you can place this test in a separate file.

/*
import { readPDF } from './PdfUploadChatGPTApp';

describe('readPDF', () => {
  test('should reject when given an invalid file', async () => {
    const file = new File(['not a pdf'], 'test.txt', { type: 'text/plain' });
    await expect(readPDF(file)).rejects.toThrow();
  });

  test('should parse a valid PDF (requires a mock or a real PDF)', async () => {
    // For a real test, you'd provide a mock PDF file or mock the pdfjs-dist calls.
    // This is just a placeholder.
    expect(true).toBe(true);
  });

  // Additional test to ensure worker loading doesn't crash.
  test('should handle missing worker gracefully', async () => {
    // We would test scenarios where pdfjs.GlobalWorkerOptions.workerSrc is invalid.
    expect(true).toBe(true);
  });

  // Additional test for version mismatch.
  test('should throw or warn if main library version does not match worker version', async () => {
    // This is just a placeholder. We'd normally test that pdfjs reports version mismatch.
    expect(true).toBe(true);
  });

  // Additional test if the CDN is unreachable or blocked.
  test('should fail or fallback if the CDN is unreachable', async () => {
    // In a real scenario, you might mock fetch or your environment to simulate a blocked CDN.
    expect(true).toBe(true);
  });
});
*/
