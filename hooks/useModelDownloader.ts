import { useState, useEffect } from "react";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import { Alert } from "react-native";

const HF_TO_GGUF = {
  "Llama-3.2-1B-Instruct": "medmekk/Llama-3.2-1B-Instruct.GGUF",
  "DeepSeek-R1-Distill-Qwen-1.5B": "medmekk/DeepSeek-R1-Distill-Qwen-1.5B.GGUF",
  "Qwen2-0.5B-Instruct": "medmekk/Qwen2.5-0.5B-Instruct.GGUF",
  "SmolLM2-1.7B-Instruct": "medmekk/SmolLM2-1.7B-Instruct.GGUF",
};

export const modelFormats = [
  { label: "Llama-3.2-1B-Instruct" },
  { label: "Qwen2-0.5B-Instruct" },
  { label: "DeepSeek-R1-Distill-Qwen-1.5B" },
  { label: "SmolLM2-1.7B-Instruct" },
];

export function useModelDownloader() {
  const [selectedModelFormat, setSelectedModelFormat] = useState<string>("");
  const [selectedGGUF, setSelectedGGUF] = useState<string | null>(null);
  const [availableGGUFs, setAvailableGGUFs] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

  const checkDownloadedModels = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory ?? "ERROR"
      );
      const ggufFiles = files.filter((file) => file.endsWith(".gguf"));
      setDownloadedModels(ggufFiles);
    } catch (error) {
      console.error("Error checking downloaded models:", error);
    }
  };

  useEffect(() => {
    checkDownloadedModels();
  }, []);

  const fetchAvailableGGUFs = async (modelFormat: string) => {
    setIsFetching(true);
    try {
      const response = await axios.get(
        `https://huggingface.co/api/models/${
          HF_TO_GGUF[modelFormat as keyof typeof HF_TO_GGUF]
        }`
      );
      const files = response.data.siblings.filter((file: any) =>
        file.rfilename.endsWith(".gguf")
      );
      setAvailableGGUFs(files.map((file: any) => file.rfilename));
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to fetch .gguf files from Hugging Face API."
      );
    } finally {
      setIsFetching(false);
    }
  };

  const handleFormatSelection = (format: string) => {
    setSelectedModelFormat(format);
    setAvailableGGUFs([]);
    fetchAvailableGGUFs(format);
  };

  const handleGGUFSelection = (file: string) => {
    setSelectedGGUF(file);
    Alert.alert(
      "Confirm Download",
      `Do you want to download ${file}?`,
      [
        {
          text: "No",
          onPress: () => setSelectedGGUF(null),
          style: "cancel",
        },
        { text: "Yes", onPress: () => handleDownloadModel(file) },
      ],
      { cancelable: false }
    );
  };

  const handleDownloadModel = async (file: string) => {
    if (!selectedModelFormat) {
      Alert.alert("Error", "No model format selected");
      return;
    }
    const downloadUrl = `https://huggingface.co/${
      HF_TO_GGUF[selectedModelFormat as keyof typeof HF_TO_GGUF]
    }/resolve/main/${file}`;
    setIsDownloading(true);
    setProgress(0);

    const destPath = `${FileSystem.documentDirectory}${file}`;

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        destPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          setProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result) {
        Alert.alert("Success", `Model downloaded to: ${result.uri}`);
        await checkDownloadedModels();
        return result.uri;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Download failed: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    selectedModelFormat,
    selectedGGUF,
    availableGGUFs,
    isDownloading,
    progress,
    isFetching,
    downloadedModels,
    handleFormatSelection,
    handleGGUFSelection,
    handleDownloadModel,
    checkDownloadedModels,
  };
}
