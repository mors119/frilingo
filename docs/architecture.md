# Architecture

## Overview

Frilingo is a VSCode extension focused on developer translation.

Primary goals:

- Translate selected text
- Generate code comments
- Korean-first workflow
- Local LLM support via Ollama

## Components

Extension Host

- Commands
- Settings
- WebView Provider

Services

- Ollama Service

UI

- React WebView

## Flow

User Selection

↓

Command

↓

Ollama Service

↓

Translation Result

↓

WebView
