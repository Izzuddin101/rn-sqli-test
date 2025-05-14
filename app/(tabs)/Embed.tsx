import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, TextInput, Button, View, ActivityIndicator, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native'; // Added FlatList

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

import { useTextEmbedding, EmbeddingResult, ModelConfig } from '../../hooks/useTextEmbedding';
import { findSimilarEntries, DatabaseEntry, SimilarityResult } from '../../hooks/useCosineSim'; // Import cosine similarity functions
import { useSQLiteContext, SQLiteDatabase } from 'expo-sqlite'; // Import useSQLiteContext

export default function TabTwoScreen() {
  const [inputText, setInputText] = useState('');
  const [embeddingResult, setEmbeddingResult] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);
  const [isComparing, setIsComparing] = useState(false); // For loading state during comparison
  const [generationRuntime, setGenerationRuntime] = useState<number | null>(null); // State for runtime

  const db = useSQLiteContext(); // Get the database instance

  const {
    isLoading: isEmbeddingHookLoading,
    isModelInitialized,
    initializeModel,
    generateEmbedding,
    downloadModel,
    deleteModel,
    isModelDownloaded,
    downloadProgress,
    selectModel,
    selectedModelConfig,
    availableModels
  } = useTextEmbedding();

  useEffect(() => {
    if (selectedModelConfig && isModelDownloaded && !isModelInitialized && !isEmbeddingHookLoading && !error?.includes(`Failed to auto-initialize ${selectedModelConfig.label}`)) {
      // console.log(`useEffect: Attempting to auto-initialize ${selectedModelConfig.label}...`);
      initializeModel().then(success => {
        if (success) {
          // console.log(`Model ${selectedModelConfig.label} initialized successfully after download/selection via useEffect.`);
        } else {
          const autoInitError = `Failed to auto-initialize ${selectedModelConfig.label}. Please try manually or re-download.`;
          // console.warn(autoInitError);
          setError(prevError => prevError ? `${prevError}\n${autoInitError}` : autoInitError);
        }
      });
    }
  }, [selectedModelConfig, isModelDownloaded, isModelInitialized, initializeModel, isEmbeddingHookLoading, error]);


  const handleInitializeModel = async () => {
    setError(null);
    if (!selectedModelConfig) {
        setError("No model selected to initialize.");
        return;
    }
    const success = await initializeModel(); 
    if (success) {
      setError(null); 
      // console.log(`Model ${selectedModelConfig.label} initialized successfully via button.`);
    } else {
      if (!error) {
        setError(`Failed to initialize ${selectedModelConfig.label}. Check console for details.`);
      }
    }
  };

  const handleCompareWithDatabase = async (userEmbedding: number[]) => {
    if (!userEmbedding || userEmbedding.length === 0) {
      setError("User embedding is not available for comparison.");
      return;
    }
    if (!db) {
      setError("Database not available for comparison.");
      return;
    }

    setIsComparing(true);
    setError(null);
    setSimilarityResults([]);

    try {
      // Fetch id, text, and embeddings from your database.
      // IMPORTANT: Ensure 'my_table' has 'id', 'text', and 'embed' columns.
      // Adjust column names if yours are different (e.g., 'entry_id AS id', 'content AS text').
      // If your identifier column is named "index", quote it and alias it to "id".
      const rawDbEntries = await db.getAllAsync<{ id: number; text: string; embed: string }>(
        "SELECT \"index\" AS id, text, embed FROM my_table WHERE embed IS NOT NULL AND embed != '';"
      );

      if (!rawDbEntries || rawDbEntries.length === 0) {
        setError("No entries with embeddings found in the database table 'my_table'.");
        setIsComparing(false);
        return;
      }
      
      const databaseEntriesForComparison: DatabaseEntry[] = rawDbEntries.map(raw => ({
        id: raw.id, // This will now correctly refer to the 'index' column aliased as 'id'
        text: raw.text, 
        embedding: raw.embed, 
      }));

      const results = findSimilarEntries(userEmbedding, databaseEntriesForComparison);
      setSimilarityResults(results.slice(0, 3)); // Get top 3 results

      if (results.length === 0) {
        setError("No similar entries found or an error occurred during comparison.");
      }

    } catch (e: any) {
      console.error("Error during database comparison:", e);
      // Check for "no such column" error specifically
      if (e.message && e.message.toLowerCase().includes("no such column")) {
        setError(`Database Error: ${e.message}. Please ensure 'my_table' has 'id', 'text', and 'embed' columns, or adjust the query in Embed.tsx.`);
      } else {
        setError(`Comparison failed: ${e.message}`);
      }
    } finally {
      setIsComparing(false);
    }
  };

  const handleEmbedText = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to embed.');
      setEmbeddingResult(null);
      setSimilarityResults([]); // Clear previous similarity results
      setGenerationRuntime(null); // Clear previous runtime
      return;
    }

    if (!isModelInitialized || !selectedModelConfig) {
      setError('Text embedding model is not selected or initialized. Please select and initialize it first.');
      setEmbeddingResult(null);
      setSimilarityResults([]);
      setGenerationRuntime(null); // Clear previous runtime
      return;
    }

    setError(null);
    setEmbeddingResult(null);
    setSimilarityResults([]);
    setGenerationRuntime(null); // Clear previous runtime
    
    // console.log(`Attempting to generate embedding for: "${inputText}" using model: ${selectedModelConfig.label}`);
    const startTime = performance.now(); // Record start time

    try {
      const result: EmbeddingResult = await generateEmbedding(inputText); 
      const endTime = performance.now(); // Record end time
      setGenerationRuntime(endTime - startTime); // Calculate and set runtime

      if (result.error) {
        // console.error(`Embedding failed for ${selectedModelConfig.label} with error in result:`, result.error);
        setError(result.error);
        setEmbeddingResult(null);
      } else if (result.embedding && result.embedding.length > 0) {
        setEmbeddingResult(result.embedding);
        // console.log(`Embedding successful for ${selectedModelConfig.label} (first 10 values):`, result.embedding.slice(0,10));
        // Automatically compare with database after successful embedding
        await handleCompareWithDatabase(result.embedding);
      } else {
        // console.error(`Embedding result is undefined or empty for ${selectedModelConfig.label} without an error.`);
        setError('Embedding failed: No embedding data returned.');
        setEmbeddingResult(null);
      }
    } catch (e: any) { 
      const endTime = performance.now(); // Record end time even on error
      setGenerationRuntime(endTime - startTime); // Calculate and set runtime
      // console.error(`CRITICAL: Crash or unexpected error during generateEmbedding call for ${selectedModelConfig.label}:`, e);
      setError(`Embedding process crashed or failed unexpectedly for ${selectedModelConfig.label}: ${e.message}`);
      setEmbeddingResult(null);
    }
  };

  const handleSelectModel = (model: ModelConfig) => {
    setError(null);
    setEmbeddingResult(null);
    setSimilarityResults([]); // Clear similarity results when model changes
    setGenerationRuntime(null); // Clear runtime when model changes
    selectModel(model);
  };

  const handleDeleteModel = async () => {
    if (!selectedModelConfig) {
        setError("No model selected to delete.");
        return;
    }
    const success = await deleteModel();
    if (success) {
        Alert.alert("Model Deleted", `${selectedModelConfig.label} files have been deleted.`);
    } else {
        Alert.alert("Error", `Could not delete ${selectedModelConfig.label} files.`);
    }
  }

  const renderSimilarityItem = ({ item }: { item: SimilarityResult }) => (
    <View style={styles.similarityItem}>
      <ThemedText style={styles.similarityText}>
        ID: {item.id} - Similarity: {item.similarity.toFixed(4)}
      </ThemedText>
      <ThemedText style={styles.similarityContentText}>Text: {item.text || "N/A"}</ThemedText>
    </View>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Embed Test & Compare</ThemedText>
      </ThemedView>

      <Collapsible title="Select Embedding Model">
        <ThemedView style={styles.modelSelectionContainer}>
          {availableModels.map((model) => (
            <TouchableOpacity
              key={model.fileName}
              style={[
                styles.modelButton,
                selectedModelConfig?.fileName === model.fileName && styles.selectedModelButton
              ]}
              onPress={() => handleSelectModel(model)}
              disabled={isEmbeddingHookLoading || isComparing}
            >
              <ThemedText style={selectedModelConfig?.fileName === model.fileName ? styles.selectedModelButtonText : styles.modelButtonText}>
                {model.label}
              </ThemedText>
              <ThemedText style={styles.modelDescriptionText}>{model.description}</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>
      </Collapsible>
      
      <ThemedView style={styles.contentContainer}>
        {selectedModelConfig && (
            <ThemedText type="subtitle">Selected Model: {selectedModelConfig.label}</ThemedText>
        )}

        {!isModelInitialized && selectedModelConfig && (
          <View style={styles.statusContainer}>
            <ThemedText>
              {isModelDownloaded ? `Model ${selectedModelConfig.label} downloaded. ` : `Model ${selectedModelConfig.label} not downloaded. `}
              Please initialize.
            </ThemedText>
            {isEmbeddingHookLoading && downloadProgress > 0 && downloadProgress < 1 && (
              <ThemedText>Download Progress: {(downloadProgress * 100).toFixed(0)}%</ThemedText>
            )}
            <Button
              title={isEmbeddingHookLoading ? (isModelDownloaded ? "Initializing..." : "Downloading...") : (isModelDownloaded ? `Initialize ${selectedModelConfig.label}` : `Download & Initialize ${selectedModelConfig.label}`)}
              onPress={handleInitializeModel}
              disabled={isEmbeddingHookLoading || !selectedModelConfig || isComparing}
            />
             <Button
              title={`Delete ${selectedModelConfig.label} Files`}
              onPress={handleDeleteModel}
              color="red"
              disabled={isEmbeddingHookLoading || !selectedModelConfig || !isModelDownloaded || isComparing}
            />
          </View>
        )}

        {isModelInitialized && selectedModelConfig && (
          <ThemedText style={{ color: 'green' }}>Model {selectedModelConfig.label} is Ready!</ThemedText>
        )}

        <ThemedText>Enter text below to generate its embedding:</ThemedText>
        <TextInput
          style={styles.textInput}
          placeholder="Enter text here"
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            setGenerationRuntime(null); // Clear runtime when input text changes
          }}
          multiline
          placeholderTextColor="#888"
          editable={isModelInitialized && !isEmbeddingHookLoading && !isComparing}
        />
        <Button
          title={(isEmbeddingHookLoading && !downloadProgress) || isComparing ? "Processing..." : "Generate Embedding & Compare"}
          onPress={handleEmbedText}
          disabled={isEmbeddingHookLoading || !isModelInitialized || !inputText.trim() || !selectedModelConfig || isComparing}
        />
        {(isEmbeddingHookLoading || isComparing) && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}
        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
        
        {embeddingResult && (
          <View style={styles.resultContainer}>
            <ThemedText type="subtitle">Generated Embedding (first 10 values):</ThemedText>
            <ScrollView style={styles.embeddingScroll}>
              <ThemedText style={styles.resultText}>
                [{embeddingResult.slice(0, 10).join(', ')}...]
              </ThemedText>
              <ThemedText style={styles.resultText}>
                Dimension: {embeddingResult.length}
              </ThemedText>
            </ScrollView>
            {generationRuntime !== null && (
              <ThemedText style={styles.runtimeText}>
                Generation Time: {generationRuntime.toFixed(2)} ms
              </ThemedText>
            )}
          </View>
        )}

        {similarityResults.length > 0 && (
          <View style={styles.similarityResultsContainer}>
            <ThemedText type="subtitle">Top 3 Similar Entries from Database:</ThemedText>
            <FlatList
              data={similarityResults}
              renderItem={renderSimilarityItem}
              keyExtractor={(item) => item.id.toString()}
            />
          </View>
        )}
      </ThemedView>
      <Collapsible title="Current Model Status">
        <ThemedText>
          Selected: {selectedModelConfig ? selectedModelConfig.label : "None"}{'\n'}
          Downloaded: {isModelDownloaded ? "Yes" : "No"}{'\n'}
          Initialized: {isModelInitialized ? "Yes" : "No"}
        </ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  // ... (keep all existing styles) ...
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  statusContainer: { 
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    gap: 8,
    marginBottom:10,
  },
  modelSelectionContainer: {
    padding: 10,
  },
  modelButton: {
    backgroundColor: '#e7e7e7',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedModelButton: {
    backgroundColor: '#4CAF50', 
    borderColor: '#388E3C',
  },
  modelButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedModelButtonText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#fff', 
  },
  modelDescriptionText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 5,
    minHeight: 80,
    textAlignVertical: 'top', 
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
  resultContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0', 
    borderRadius: 5,
  },
  embeddingScroll: {
    maxHeight: 100, 
  },
  resultText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', 
    fontSize: 12,
  },
  runtimeText: { // Style for the runtime display
    marginTop: 5,
    fontSize: 12,
    color: '#555',
  },
  similarityResultsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e8f4f8',
    borderRadius: 5,
  },
  similarityItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d0e0e8',
  },
  similarityText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  similarityContentText: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  }
});
