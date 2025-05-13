import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ort from 'onnxruntime-react-native';

// Model Options for Embedding, there is 1 Quantized Model, and 4 Other "Optimized" models
const MODEL_OPTIONS = [
    {
      label: "Optimized Level 1",
      repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      fileName: "onnx/model_O1.onnx",
      tokenPadding: 12,
      description: "Optimization level 1",
      needsTokenTypeIds: true
    },
    {
      label: "Optimized Level 2",
      repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      fileName: "onnx/model_O2.onnx",
      tokenPadding: 12,
      description: "Optimization level 2",
      needsTokenTypeIds: true
    },
    {
      label: "Optimized Level 3",
      repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      fileName: "onnx/model_O3.onnx",
      tokenPadding: 12,
      description: "Optimization level 3",
      needsTokenTypeIds: true
    },
    {
      label: "Optimized Level 4",
      repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      fileName: "onnx/model_O4.onnx",
      tokenPadding: 12,
      description: "Optimization level 4 (half precision)",
      needsTokenTypeIds: true
    }
  ];

// Add platform-specific quantized models ju
if (Platform.OS === 'ios') {
    MODEL_OPTIONS.push({
      label: "Quantized for ARM64 (iOS)",
      repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      fileName: "onnx/model_qint8_arm64.onnx",
      tokenPadding: 12,
      description: "8-bit quantized for ARM64 processors",
      needsTokenTypeIds: true
    });
  } else {
    // For Android and other platforms, add the AVX2 version as it's more broadly compatible
    MODEL_OPTIONS.push({
      label: "Quantized (General)",
      repo: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      fileName: "onnx/model_quint8_avx2.onnx",
      tokenPadding: 12,
      description: "8-bit quantized for general use",
      needsTokenTypeIds: true
    });
  }

  