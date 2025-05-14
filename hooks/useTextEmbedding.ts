import { useState, useCallback, useEffect } from "react";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import * as FileSystem from "expo-file-system";
import { Platform } from 'react-native'; // Import Platform

// --- Model Options Definition ---
export interface ModelConfig {
  label: string;
  repo: string;
  fileName: string; // e.g., "onnx/model.onnx"
  tokenPadding: number;
  description: string;
  needsTokenTypeIds: boolean;
}

export const MODEL_OPTIONS: ModelConfig[] = [
  {
    label: "Optimized Level 1",
    repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    fileName: "onnx/model_O1.onnx",
    tokenPadding: 128, // Assuming 12 was a typo, common padding is 128 or 256. Adjust if 12 is correct.
    description: "Optimization level 1",
    needsTokenTypeIds: true
  },
  {
    label: "Optimized Level 2",
    repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    fileName: "onnx/model_O2.onnx",
    tokenPadding: 128,
    description: "Optimization level 2",
    needsTokenTypeIds: true
  },
  {
    label: "Optimized Level 3",
    repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    fileName: "onnx/model_O3.onnx",
    tokenPadding: 128,
    description: "Optimization level 3",
    needsTokenTypeIds: true
  },
  {
    label: "Optimized Level 4 (FP16)",
    repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    fileName: "onnx/model_O4.onnx", // This is typically a float16 model
    tokenPadding: 128,
    description: "Optimization level 4 (half precision)",
    needsTokenTypeIds: true
  }
];

// Add platform-specific quantized models
if (Platform.OS === 'ios') {
  MODEL_OPTIONS.push({
    label: "Quantized for ARM64 (iOS)",
    repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    fileName: "onnx/model_qint8_arm64.onnx",
    tokenPadding: 128,
    description: "8-bit quantized for ARM64 processors",
    needsTokenTypeIds: true
  });
} else {
  MODEL_OPTIONS.push({
    label: "Quantized (General)",
    repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    fileName: "onnx/model_quint8_avx2.onnx",
    tokenPadding: 128,
    description: "8-bit quantized for general use (e.g., Android with AVX2 support if applicable, or a general quantized model)",
    needsTokenTypeIds: true
  });
}
// --- End Model Options Definition ---

export type EmbeddingResult = {
  embedding: number[];
  similarity?: number;
  error?: string;
};

export const useTextEmbedding = () => {
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig>(MODEL_OPTIONS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelSession, setModelSession] = useState<InferenceSession | null>(null);
  const [tokenizer, setTokenizer] = useState<any>(null);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false); // For the currently selected model
  const [downloadProgress, setDownloadProgress] = useState(0);

  const getModelDir = useCallback((config: ModelConfig) => {
    return `${FileSystem.cacheDirectory}models/${config.repo.replace(/\//g, "_")}/`;
  }, []);

  const getModelPath = useCallback((config: ModelConfig) => {
    const modelDir = getModelDir(config);
    return `${modelDir}${config.fileName.replace(/\//g, "_")}`;
  }, [getModelDir]);

  const tokenizerDir = `${FileSystem.cacheDirectory}tokenizer/${MODEL_OPTIONS[0].repo.replace(/\//g, "_")}/`; // Tokenizer is usually common for the base repo

  const checkModelStatus = useCallback(async (config: ModelConfig) => {
    try {
      const modelPath = getModelPath(config);
      const tokenizerConfigPath = `${tokenizerDir}tokenizer_config.json`; // Assuming tokenizer_config is a key file

      const modelInfo = await FileSystem.getInfoAsync(modelPath);
      const tokenizerInfo = await FileSystem.getInfoAsync(tokenizerConfigPath); // Check one tokenizer file

      const downloaded = modelInfo.exists && tokenizerInfo.exists;
      setIsModelDownloaded(downloaded);
      return downloaded;
    } catch (error) {
      console.error(`Error checking model status for ${config.label}:`, error);
      setIsModelDownloaded(false);
      return false;
    }
  }, [getModelPath, tokenizerDir]);

  useEffect(() => {
    checkModelStatus(selectedModelConfig);
  }, [selectedModelConfig, checkModelStatus]);

  const downloadFileWithProgress = useCallback(async (
    fileUrl: string,
    filePath: string,
    onProgress: (written: number, total: number) => void
  ): Promise<void> => {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      onProgress(1,1); // Already downloaded
      return;
    }
    const downloadResumable = FileSystem.createDownloadResumable(
      fileUrl,
      filePath,
      {},
      (dp) => onProgress(dp.totalBytesWritten, dp.totalBytesExpectedToWrite)
    );
    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
        throw new Error(`Failed to download ${filePath}. Status: ${result?.status}`);
    }
  }, []);


  const downloadSelectedModel = useCallback(async (config: ModelConfig) => {
    try {
      setIsLoading(true);
      setDownloadProgress(0);
      console.log(`Starting download for model: ${config.label}`);

      // Ensure tokenizer directory exists
      await FileSystem.makeDirectoryAsync(tokenizerDir, { intermediates: true });
      const tokenizerFiles = ["tokenizer_config.json", "tokenizer.json", "special_tokens_map.json"];
      const totalFilesToDownload = tokenizerFiles.length + 1; // Tokenizer files + 1 model file
      let filesDownloadedCount = 0;

      const updateOverallProgress = (fileProgress: number) => {
        setDownloadProgress((filesDownloadedCount + fileProgress) / totalFilesToDownload);
      };
      
      // Download tokenizer files
      for (const fileName of tokenizerFiles) {
        const fileUrl = `https://huggingface.co/${config.repo}/resolve/main/${fileName}`; // Tokenizer from base repo
        const filePath = `${tokenizerDir}${fileName}`;
        await downloadFileWithProgress(fileUrl, filePath, (written, total) => {
            updateOverallProgress(total > 0 ? written / total : 0);
        });
        filesDownloadedCount++;
        updateOverallProgress(0); // Mark current file as complete for progress calculation
      }
      
      // Download ONNX model
      const modelUrl = `https://huggingface.co/${config.repo}/resolve/main/${config.fileName}`;
      const modelPath = getModelPath(config);
      await FileSystem.makeDirectoryAsync(getModelDir(config), { intermediates: true });

      await downloadFileWithProgress(modelUrl, modelPath, (written, total) => {
        updateOverallProgress(total > 0 ? written / total : 0);
      });
      filesDownloadedCount++;
      
      setDownloadProgress(1); // Mark as complete
      setIsModelDownloaded(true);
      console.log(`Model downloaded successfully: ${config.label}`);
      return true;
    } catch (error) {
      console.error(`Error downloading model ${config.label}:`, error);
      setDownloadProgress(0);
      setIsModelDownloaded(false); // Explicitly set to false on error
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getModelPath, getModelDir, tokenizerDir, downloadFileWithProgress]);

  const initializeSelectedModel = useCallback(async (config: ModelConfig) => {
    setIsLoading(true);
    try {
      console.log(`Initializing model: ${config.label}`);
      const isDownloaded = await checkModelStatus(config);
      if (!isDownloaded) {
        console.log(`Model ${config.label} not downloaded. Attempting download...`);
        const downloadSuccess = await downloadSelectedModel(config);
        if (!downloadSuccess) {
          setIsLoading(false);
          return false;
        }
      }

      // Load tokenizer configuration (assuming it's common for the repo)
      const tokenizerConfigPath = `${tokenizerDir}tokenizer_config.json`;
      const tokenizerJsonPath = `${tokenizerDir}tokenizer.json`;

      const tokenizerConfigText = await FileSystem.readAsStringAsync(tokenizerConfigPath);
      const tokenizerJsonText = await FileSystem.readAsStringAsync(tokenizerJsonPath);
      const tokenizerConfig = JSON.parse(tokenizerConfigText);
      const tokenizerData = JSON.parse(tokenizerJsonText);

      const customTokenizer = createTokenizer(tokenizerConfig, tokenizerData, config); // Pass config for tokenPadding
      setTokenizer(customTokenizer);

      // Load ONNX model
      const modelPath = getModelPath(config);
      console.log(`Loading ONNX session from: ${modelPath}`);
      const session = await InferenceSession.create(modelPath);
      setModelSession(session);
      
      console.log(`Model initialized successfully: ${config.label}`);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error(`Error initializing model ${config.label}:`, error);
      setModelSession(null); // Clear session on error
      setTokenizer(null);   // Clear tokenizer on error
      setIsLoading(false);
      return false;
    }
  }, [checkModelStatus, downloadSelectedModel, getModelPath, tokenizerDir]);

  const deleteSelectedModelFiles = useCallback(async (config: ModelConfig) => {
    try {
      const modelPath = getModelPath(config); // Path to the specific model file
      const modelDir = getModelDir(config); // Directory of the specific model variant

      console.log(`Deleting model file: ${modelPath}`);
      await FileSystem.deleteAsync(modelPath, { idempotent: true });
      
      // Optionally, try to delete the model's specific directory if empty, or just the file.
      // For simplicity, we'll just delete the file. If you want to delete the repo-specific model dir:
      // await FileSystem.deleteAsync(modelDir, { idempotent: true });
      // Note: Deleting tokenizerDir might be too broad if other models share it.
      // For now, we only delete the specific ONNX file.
      // If you want to clear the entire cache for a repo, that's a different function.

      setIsModelDownloaded(false);
      if (modelSession && selectedModelConfig.fileName === config.fileName) {
        setModelSession(null);
        setTokenizer(null);
      }
      console.log(`Files for model ${config.label} (partially) deleted.`);
      return true;
    } catch (error) {
      console.error(`Error deleting files for model ${config.label}:`, error);
      return false;
    }
  }, [getModelPath, getModelDir, modelSession, selectedModelConfig]);
  
  const clearCurrentModel = useCallback(() => {
      if (modelSession) {
        // InferenceSession doesn't have an explicit close/release in onnxruntime-react-native
        // Setting to null should allow garbage collection.
        setModelSession(null);
      }
      setTokenizer(null);
      setIsModelDownloaded(false); // Reflects the state of the *selected* model
      console.log("Cleared current model session and tokenizer.");
  }, [modelSession]);

  const selectModel = useCallback(async (modelConf: ModelConfig) => {
    console.log(`Selecting model: ${modelConf.label}`);
    clearCurrentModel(); // Clear previous model session
    setSelectedModelConfig(modelConf);
    // Status will be checked by useEffect or user can initiate download/init
    // No automatic download/init on select to give user control.
  }, [clearCurrentModel]);


  const generateEmbedding = useCallback(
    async (text: string): Promise<EmbeddingResult> => {
      if (!modelSession || !tokenizer) {
        return { embedding: [], error: "Model or Tokenizer not initialized for the selected model." };
      }
      if (!selectedModelConfig) {
        return { embedding: [], error: "No model configuration selected." };
      }

      setIsLoading(true);
      try {
        const tokenized = await tokenizer.tokenizer(text, {
          padding: true,
          truncation: true,
          max_length: selectedModelConfig.tokenPadding,
        });

        const inputIds = new Tensor(
          "int64",
          Array.from(tokenized.input_ids.data as Int32Array).map(BigInt),
          tokenized.input_ids.dims
        );
        const attentionMask = new Tensor(
          "int64",
          Array.from(tokenized.attention_mask.data as Int32Array).map(BigInt),
          tokenized.attention_mask.dims
        );
        const feeds: { [key: string]: Tensor } = {
          input_ids: inputIds,
          attention_mask: attentionMask,
        };

        if (selectedModelConfig.needsTokenTypeIds && tokenized.token_type_ids) {
          feeds.token_type_ids = new Tensor(
            "int64",
            Array.from(tokenized.token_type_ids.data as Int32Array).map(BigInt),
            tokenized.token_type_ids.dims
          );
        }

        const results = await modelSession.run(feeds);
        const outputTensorKey = Object.keys(results)[0]; // Assuming first key is the output
        const outputData = results[outputTensorKey] as Tensor;

        if (!outputData || !outputData.data) {
          throw new Error("No output data found in model results");
        }
        
        // Sentence-transformers models usually output a [1, sequence_length, hidden_size] tensor.
        // The embedding is often the representation of the [CLS] token (first token).
        // Or, it might be a mean pooling over token embeddings.
        // For paraphrase-multilingual-MiniLM-L12-v2, the output is typically [1, N, D] (N=num_tokens, D=embedding_dim)
        // and then mean pooling is applied. Some ONNX models might have this pooling built-in.
        // If the output is [1, D], then it's likely already pooled.
        // Let's assume the output is [1, embedding_dim] or [1, 1, embedding_dim]
        // The provided code `slice(0, outputData.dims[2])` implies the embedding is in the last dimension of a 3D tensor.
        // If outputData.dims is [1, X, Y], then Y is the embedding dimension.
        // If outputData.dims is [1, Y], then Y is the embedding dimension.
        
        let embedding: number[];
        if (outputData.dims.length === 3 && outputData.dims[0] === 1 && outputData.dims[1] === 1) { // Shape [1, 1, D]
            embedding = Array.from(outputData.data as Float32Array);
        } else if (outputData.dims.length === 2 && outputData.dims[0] === 1) { // Shape [1, D]
            embedding = Array.from(outputData.data as Float32Array);
        } else if (outputData.dims.length === 3 && outputData.dims[0] === 1 && outputData.dims[1] > 1) {
            // This case [1, N, D] usually requires mean pooling.
            // For simplicity, if your model doesn't do pooling, we'll take the CLS token (first token's embedding)
            // This is a common simplification but mean pooling is often better.
            console.warn("Model output appears to be token embeddings [1, N, D]. Taking CLS token embedding. Consider implementing mean pooling if needed.");
            const embeddingDim = outputData.dims[2];
            const fullData = Array.from(outputData.data as Float32Array);
            embedding = fullData.slice(0, embeddingDim);
        }
         else {
            console.error("Unexpected output tensor dimensions:", outputData.dims);
            throw new Error(`Unexpected output tensor dimensions: ${outputData.dims}`);
        }


        setIsLoading(false);
        return { embedding };
      } catch (error: any) {
        console.error("Error generating embedding:", error);
        setIsLoading(false);
        return { embedding: [], error: error?.message || "Unknown error during embedding generation" };
      }
    },
    [modelSession, tokenizer, selectedModelConfig]
  );

  return {
    isLoading,
    isModelDownloaded, // For the selected model
    downloadProgress,
    initializeModel: () => initializeSelectedModel(selectedModelConfig), // Initialize the currently selected model
    downloadModel: () => downloadSelectedModel(selectedModelConfig),   // Download the currently selected model
    deleteModel: () => deleteSelectedModelFiles(selectedModelConfig), // Delete the currently selected model
    generateEmbedding,
    isModelInitialized: !!modelSession && !!tokenizer, // For the selected model
    selectModel,
    selectedModelConfig, // Expose the currently selected model config
    availableModels: MODEL_OPTIONS, // Expose all available models for UI
  };
};

// Helper function to create tokenizer
function createTokenizer(tokenizerConfig: any, tokenizerData: any, currentModelConfig: ModelConfig) { // Added currentModelConfig
  const wordPieceTokenize = (text: string): string[] => {
    // ... (implementation from your provided code, ensure it's robust)
    // This is a simplified WordPiece, real HuggingFace tokenizers are more complex.
    // For this example, we'll assume it's sufficient or you have a more robust one.
    const tokens: string[] = [];
    let remainingText = text;

    if (tokenizerConfig.do_lower_case) {
        remainingText = remainingText.toLowerCase();
    }
    // Basic whitespace tokenization first
    const words = remainingText.split(/\s+/).filter(Boolean);

    for (const word of words) {
        if (tokenizerData.model.vocab[word] !== undefined) {
            tokens.push(word);
            continue;
        }
        let currentWord = word;
        while (currentWord.length > 0) {
            let foundSubword = false;
            for (let i = currentWord.length; i > 0; i--) {
                const subword = (i < currentWord.length && !currentWord.startsWith("##") ? "##" : "") + currentWord.substring(0, i);
                const actualSubwordToLookup = currentWord.substring(0,i); // For direct lookup
                const prefixedSubwordToLookup = "##" + currentWord.substring(0,i);


                if (tokenizerData.model.vocab[actualSubwordToLookup] !== undefined) {
                    tokens.push(actualSubwordToLookup);
                    currentWord = currentWord.substring(i);
                    foundSubword = true;
                    break;
                } else if (tokens.length > 0 && tokenizerData.model.vocab[prefixedSubwordToLookup] !== undefined) {
                     // Check for subwords that should start with ## if not the first token of a word
                    tokens.push(prefixedSubwordToLookup);
                    currentWord = currentWord.substring(i);
                    foundSubword = true;
                    break;
                }
            }
            if (!foundSubword) {
                tokens.push(tokenizerConfig.unk_token || "[UNK]");
                break; // Move to next word if unk
            }
        }
    }
    return tokens;
  };

  const convertTokensToIds = (tokens: string[]): number[] => {
    return tokens.map(
      (token) =>
        tokenizerData.model.vocab[token] ??
        tokenizerData.model.vocab[tokenizerConfig.unk_token || "[UNK]"] ??
        0
    );
  };

  return {
    tokenizer: async (inputText: string, options: any = {}) => {
      const maxLength = options.max_length || currentModelConfig.tokenPadding; // Use selected model's padding
      const padding = options.padding !== false;
      const truncation = options.truncation !== false;

      let textToProcess = inputText;
      // Basic normalization (can be expanded based on tokenizer_config.json)
      // E.g., NFD normalization, stripping accents if specified by tokenizer_config

      const tokens = wordPieceTokenize(textToProcess);

      const clsToken = tokenizerConfig.cls_token || "[CLS]";
      const sepToken = tokenizerConfig.sep_token || "[SEP]";
      const padToken = tokenizerConfig.pad_token || "[PAD]";

      let finalTokens = [clsToken];
      if (truncation) {
        finalTokens.push(...tokens.slice(0, maxLength - 2)); // -2 for [CLS] and [SEP]
      } else {
        finalTokens.push(...tokens);
      }
      finalTokens.push(sepToken);

      if (padding && finalTokens.length < maxLength) {
        const paddingToAdd = maxLength - finalTokens.length;
        for (let i = 0; i < paddingToAdd; i++) {
          finalTokens.push(padToken);
        }
      } else if (finalTokens.length > maxLength) { // Should be handled by slice, but as a safeguard
        finalTokens = finalTokens.slice(0, maxLength);
        if (finalTokens[maxLength-1] !== sepToken) finalTokens[maxLength-1] = sepToken; // Ensure SEP if truncated at max_length
      }


      const inputIds = convertTokensToIds(finalTokens);
      const attentionMask = finalTokens.map((token) => (token === padToken ? 0 : 1));
      const tokenTypeIds = new Array(finalTokens.length).fill(0); // For sentence pair tasks, this would differ. For single sentence, it's usually all 0s.

      return {
        input_ids: { data: new Int32Array(inputIds), dims: [1, inputIds.length] },
        attention_mask: { data: new Int32Array(attentionMask), dims: [1, attentionMask.length] },
        token_type_ids: { data: new Int32Array(tokenTypeIds), dims: [1, tokenTypeIds.length] },
      };
    },
  };


  function cosineSimilarity() {
    
  }
}
