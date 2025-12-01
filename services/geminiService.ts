import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptSegment, VocabWord } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FLASH = 'gemini-2.5-flash';

// Helper to convert file to base64 (for small files)
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to upload large files to Gemini API
const uploadFileToGemini = async (file: File): Promise<string> => {
  const apiKey = process.env.API_KEY;
  const uploadBaseUrl = "https://generativelanguage.googleapis.com/upload/v1beta/files";
  
  // 1. Initiate Resumable Upload
  const startResponse = await fetch(`${uploadBaseUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': file.size.toString(),
      'X-Goog-Upload-Header-Content-Type': file.type,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });

  if (!startResponse.ok) throw new Error("Failed to initiate upload");
  
  const uploadUrl = startResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error("No upload URL received");

  // 2. Upload File Content
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': file.size.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: file,
  });

  if (!uploadResponse.ok) throw new Error("Failed to upload file data");

  const uploadResult = await uploadResponse.json();
  const fileUri = uploadResult.file.uri;
  let state = uploadResult.file.state;
  const fileName = uploadResult.file.name;

  // 3. Poll for Active State (Required for videos)
  while (state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pollResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
    const pollResult = await pollResponse.json();
    state = pollResult.state;
    if (state === 'FAILED') throw new Error("File processing failed on server");
  }

  return fileUri;
};

export const generateTranscript = async (file: File): Promise<TranscriptSegment[]> => {
  try {
    let contentPart;
    
    // Strategy: Use inline base64 for small files (< 20MB) for speed.
    // Use File API for large files (> 20MB) to avoid browser memory issues and payload limits.
    const SIZE_LIMIT = 20 * 1024 * 1024; // 20MB

    if (file.size < SIZE_LIMIT) {
      console.log("Using inline upload for small file");
      contentPart = await fileToGenerativePart(file);
    } else {
      console.log("Using File API for large file");
      const fileUri = await uploadFileToGemini(file);
      contentPart = {
        fileData: {
          fileUri: fileUri,
          mimeType: file.type
        }
      };
    }

    const prompt = `
      You are an expert English language tutor creating study material.
      Analyze the audio/video.
      Break it down into logical sentences for a dictation exercise.
      For each segment:
      1. precise start and end timestamps (in seconds).
      2. English text.
      3. Chinese translation.

      Return strictly a JSON array.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: {
        parts: [contentPart, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              en: { type: Type.STRING },
              zh: { type: Type.STRING },
            },
            required: ["start", "end", "en", "zh"],
          },
        },
      },
    });

    const data = JSON.parse(response.text || "[]");
    // Add IDs
    return data.map((item: any, index: number) => ({ ...item, id: index }));

  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw new Error("Failed to process media. For large files, please wait longer for upload.");
  }
};

export const getWordDefinition = async (word: string, contextSentence: string): Promise<VocabWord> => {
  const prompt = `
    Analyze the word "${word}" as used in this sentence: "${contextSentence}".
    Provide:
    1. The direct Chinese translation (meaning) e.g., "苹果".
    2. International Phonetic Alphabet (IPA) transcription e.g., /æpl/. Do NOT use Pinyin.
    3. Part of Speech e.g., "noun", "verb", "adj".
    4. A simple example sentence in English.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_FLASH,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          definition: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          example: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

export const chatWithAi = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
    const chat = ai.chats.create({
        model: MODEL_FLASH,
        history: history,
        config: {
            systemInstruction: "You are a helpful, encouraging English teacher helping a student understand a specific text. Keep answers brief and clear.",
        }
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
}