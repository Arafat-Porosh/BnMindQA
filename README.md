# BnMindQA

BnMindQA is a Retrieval-Augmented Question Answering (RAG-QA) framework designed to provide reliable mental health information in Bangla. The system combines a hybrid retrieval pipeline with a domain-adapted large language model to generate accurate and context-grounded responses.

## Key Features

- Bangla mental health question answering
- Hybrid retrieval using:
  - BGE-M3 dense retrieval
  - BM25 sparse retrieval
  - Reciprocal Rank Fusion (RRF)
  - Cross-Encoder reranking
- QLoRA fine-tuned Gemma-3-4B-IT model
- ChromaDB vector database
- Retrieval-grounded answer generation
- Web-based user interface

![BnMindQA Interface](https://github.com/Arafat-Porosh/BnMindQA/blob/ea919640dc646f6bb931d01fbae3eb15214445da/bnmindqa_ui.png)

## Architecture

Source Documents → Chunking → BGE-M3 Embeddings + BM25 Index → Hybrid Retrieval → RRF Fusion → Cross-Encoder Reranking → Prompt Construction → Fine-Tuned Gemma-3-4B-IT → Bangla Answer
